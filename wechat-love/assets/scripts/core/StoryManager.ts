/**
 * 剧情系统 - StoryManager
 * 负责剧情脚本的加载、解析、节点管理
 */

import { EventEmitter } from './EventEmitter';
import { DialogSystem, StoryNode, NodeType, ChoiceData, Effect } from './DialogSystem';
import { CharacterSystem } from './CharacterSystem';
import { GameStateMachine, GameState } from './GameStateMachine';

// 章节数据
export interface Chapter {
    id: string;
    title: string;
    description: string;
    unlockCondition?: {
        type: string;
        value: any;
    };
    bgm?: string;
    nodes: Record<string, StoryNode>;
}

// 剧情配置
export interface StoryConfig {
    chapters: Chapter[];
    commonNodes?: Record<string, any>;
}

export class StoryManager extends EventEmitter {
    private static _instance: StoryManager;
    public static get instance(): StoryManager {
        if (!StoryManager._instance) {
            StoryManager._instance = new StoryManager();
        }
        return StoryManager._instance;
    }

    // 剧情配置
    private _config: StoryConfig = null!;
    
    // 当前章节
    private _currentChapter: Chapter = null!;
    private _currentNodeId: string = '';

    // 标志位（剧情内）
    private _localFlags: Map<string, boolean> = new Map();

    // 已访问节点
    private _visitedNodes: Set<string> = new Set();

    // 历史选择
    private _choiceHistory: string[] = [];

    private constructor() {
        super();
    }

    /**
     * 初始化剧情系统
     */
    async init() {
        await this.loadStoryConfig();
        console.log('[StoryManager] 初始化完成');
    }

    /**
     * 加载剧情配置
     */
    private async loadStoryConfig() {
        // TODO: 从JSON文件加载
        // const config = await Resources.load('data/story', JSON);
        
        // 使用模拟数据
        this._config = {
            chapters: [
                {
                    id: 'ch00',
                    title: '序章 - 入学第一天',
                    description: '故事从主角入学圣樱学院开始...',
                    bgm: 'bgm_chapter_0',
                    nodes: {
                        'ch00_start': {
                            id: 'ch00_start',
                            type: NodeType.NARRATION,
                            background: 'bg_school_gate',
                            content: '九月的阳光洒在圣樱学院的校门上，我站在这里，心跳加速...',
                            next: 'ch00_01',
                        },
                        'ch00_01': {
                            id: 'ch00_01',
                            type: NodeType.DIALOG,
                            speaker: 'player',
                            content: '这就是圣樱学院吗...真大啊...',
                            next: 'ch00_02',
                        },
                    },
                },
            ],
        };
    }

    /**
     * 开始章节
     */
    async playChapter(chapterId: string): Promise<boolean> {
        const chapter = this._config.chapters.find(c => c.id === chapterId);
        if (!chapter) {
            console.error(`[StoryManager] 未找到章节: ${chapterId}`);
            return false;
        }

        // 检查解锁条件
        if (chapter.unlockCondition && !this.checkCondition(chapter.unlockCondition)) {
            console.warn(`[StoryManager] 章节未解锁: ${chapterId}`);
            this.emit('chapterLocked', chapter);
            return false;
        }

        this._currentChapter = chapter;
        
        // 播放BGM
        if (chapter.bgm) {
            // AudioManager.playBGM(chapter.bgm);
        }

        // 开始第一章
        const firstNodeId = Object.keys(chapter.nodes)[0];
        if (firstNodeId) {
            await this.playNode(firstNodeId);
        }

        this.emit('chapterStarted', chapter);
        return true;
    }

    /**
     * 播放节点
     */
    async playNode(nodeId: string): Promise<boolean> {
        if (!this._currentChapter) {
            console.error('[StoryManager] 当前没有章节');
            return false;
        }

        const node = this._currentChapter.nodes[nodeId];
        if (!node) {
            console.error(`[StoryManager] 未找到节点: ${nodeId}`);
            return false;
        }

        this._currentNodeId = nodeId;
        this._visitedNodes.add(nodeId);

        // 切换游戏状态
        const stateMachine = GameStateMachine.instance;
        
        // 监听对话框事件
        const dialogSystem = DialogSystem.instance;
        
        dialogSystem.off('requestNode');
        dialogSystem.on('requestNode', (nextNodeId: string) => {
            this.playNode(nextNodeId);
        });

        dialogSystem.off('nodeSelected');
        dialogSystem.on('nodeSelected', (nextNodeId: string) => {
            this.playNode(nextNodeId);
        });

        // 播放节点
        dialogSystem.playNode(node);

        this.emit('nodePlayed', node);
        return true;
    }

    /**
     * 下一节点
     */
    async next(): Promise<boolean> {
        if (!this._currentChapter) return false;

        const currentNode = this._currentChapter.nodes[this._currentNodeId];
        if (!currentNode || !currentNode.next) {
            // 章节结束
            return this.endChapter();
        }

        return this.playNode(currentNode.next);
    }

    /**
     * 选择选项
     */
    async selectChoice(choice: ChoiceData): Promise<boolean> {
        // 记录选择
        this._choiceHistory.push(choice.id);

        // 应用效果
        if (choice.effects) {
            this.applyEffects(choice.effects);
        }

        // 好感度变化
        if (choice.favorChange) {
            const charSystem = CharacterSystem.instance;
            for (const [charId, delta] of Object.entries(choice.favorChange)) {
                charSystem.changeFavor(charId, delta);
            }
        }

        // 跳转到下一节点
        return this.playNode(choice.next);
    }

    /**
     * 应用效果列表
     */
    private applyEffects(effects: Effect[]) {
        for (const effect of effects) {
            switch (effect.type) {
                case 'flag':
                    this.setLocalFlag(effect.target, effect.value);
                    break;
                case 'unlock':
                    // TODO: 解锁内容
                    break;
                case 'scene':
                    // TODO: 切换场景
                    break;
            }
        }
    }

    /**
     * 结束章节
     */
    private async endChapter(): Promise<boolean> {
        const currentIndex = this._config.chapters.findIndex(
            c => c.id === this._currentChapter?.id
        );

        if (currentIndex < this._config.chapters.length - 1) {
            // 下一章节
            const nextChapter = this._config.chapters[currentIndex + 1];
            return this.playChapter(nextChapter.id);
        }

        // 全部结束
        const stateMachine = GameStateMachine.instance;
        stateMachine.changeState(GameState.ENDING);
        
        this.emit('storyEnded');
        return true;
    }

    /**
     * 检查条件
     */
    checkCondition(condition: { type: string; value: any }): boolean {
        switch (condition.type) {
            case 'chapter':
                // 已通过某章节
                return this._visitedNodes.size > 0;
            case 'flag':
                return this.getLocalFlag(condition.target);
            default:
                return true;
        }
    }

    /**
     * 获取本地标志位
     */
    getLocalFlag(flag: string): boolean {
        return this._localFlags.get(flag) ?? false;
    }

    /**
     * 设置本地标志位
     */
    setLocalFlag(flag: string, value: boolean): void {
        this._localFlags.set(flag, value);
    }

    /**
     * 获取当前进度
     */
    getProgress(): { chapter: string; node: string } {
        return {
            chapter: this._currentChapter?.id || '',
            node: this._currentNodeId,
        };
    }

    /**
     * 跳转到指定节点
     */
    async jumpTo(chapterId: string, nodeId: string): Promise<boolean> {
        if (chapterId !== this._currentChapter?.id) {
            await this.playChapter(chapterId);
        }
        return this.playNode(nodeId);
    }

    /**
     * 导出剧情数据（用于存档）
     */
    exportData(): any {
        return {
            currentChapter: this._currentChapter?.id,
            currentNode: this._currentNodeId,
            visitedNodes: Array.from(this._visitedNodes),
            choiceHistory: this._choiceHistory,
            localFlags: Object.fromEntries(this._localFlags),
        };
    }

    /**
     * 导入剧情数据（用于读档）
     */
    importData(data: any) {
        if (data.currentChapter) {
            this.playChapter(data.currentChapter);
        }
        if (data.currentNode) {
            this._currentNodeId = data.currentNode;
        }
        if (data.visitedNodes) {
            this._visitedNodes = new Set(data.visitedNodes);
        }
        if (data.choiceHistory) {
            this._choiceHistory = data.choiceHistory;
        }
        if (data.localFlags) {
            this._localFlags = new Map(Object.entries(data.localFlags));
        }
    }

    /**
     * 重置
     */
    reset() {
        this._currentChapter = null!;
        this._currentNodeId = '';
        this._localFlags.clear();
        this._visitedNodes.clear();
        this._choiceHistory = [];
    }
}
