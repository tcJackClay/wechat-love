/**
 * 对话系统 - DialogSystem
 * 负责剧情对话的播放、选项处理、文本打字机效果
 */

import { _decorator, Component, Node, Label, Sprite, RichText, tween, Vec3 } from 'cc';
import { GameStateMachine, GameState, DialogState } from './GameStateMachine';
import { EventEmitter } from './EventEmitter';

const { ccclass, property } = _decorator;

// 剧情节点类型
export enum NodeType {
    DIALOG = 'dialog',       // 对话
    NARRATION = 'narration', // 旁白
    CHOICE = 'choice',       // 选择
    BRANCH = 'branch',       // 条件分支
    EVENT = 'event',         // 事件
    END = 'end',            // 结束
}

// 剧情节点
export interface StoryNode {
    id: string;
    type: NodeType;
    speaker?: string;        // 说话者ID
    content: string;         // 文本内容
    background?: string;     // 背景图
    character?: CharacterDisplay; // 角色显示
    choices?: ChoiceData[];  // 选项列表
    next?: string;           // 下一节点ID
    conditions?: Condition[];// 触发条件
    effects?: Effect[];      // 节点效果
}

// 角色显示
export interface CharacterDisplay {
    id: string;
    pose: string;            // 姿态
    position: string;        // 位置 left/center/right
    fade?: string;          // 淡入淡出
}

// 选择数据
export interface ChoiceData {
    id: string;
    text: string;
    next: string;
    conditions?: Condition[];
    effects?: Effect[];
    favorChange?: Record<string, number>;
}

// 条件
export interface Condition {
    type: 'favor' | 'flag' | 'chapter' | 'item';
    target: string;
    value: any;
}

// 效果
export interface Effect {
    type: 'favor' | 'flag' | 'item' | 'scene' | 'unlock';
    target: string;
    value: any;
}

@ccclass('DialogSystem')
export class DialogSystem extends EventEmitter {
    private static _instance: DialogSystem;
    public static get instance(): DialogSystem {
        if (!DialogSystem._instance) {
            DialogSystem._instance = new DialogSystem();
        }
        return DialogSystem._instance;
    }

    // UI组件引用
    private _dialogBox: Node = null!;
    private _speakerLabel: Label = null!;
    private _contentLabel: RichText = null!;
    private _characterRoot: Node = null!;
    private _choicePanel: Node = null!;

    // 状态
    private _isTyping: boolean = false;
    private _currentNode: StoryNode = null!;
    private _currentText: string = '';
    private _typingSpeed: number = 50;  // ms/字
    private _autoMode: boolean = false;
    private _autoDelay: number = 2000;

    // 打字机定时器
    private _typingTimer: number = 0;
    private _displayedChars: number = 0;

    private constructor() {
        super();
    }

    /**
     * 初始化对话系统
     */
    init(dialogBox: Node, speakerLabel: Label, contentLabel: RichText, 
         characterRoot: Node, choicePanel: Node) {
        this._dialogBox = dialogBox;
        this._speakerLabel = speakerLabel;
        this._contentLabel = contentLabel;
        this._characterRoot = characterRoot;
        this._choicePanel = choicePanel;

        console.log('[DialogSystem] 初始化完成');
    }

    /**
     * 播放剧情节点
     */
    playNode(node: StoryNode) {
        this._currentNode = node;
        
        // 应用节点效果
        if (node.effects) {
            this.applyEffects(node.effects);
        }

        // 切换背景
        if (node.background) {
            this.changeBackground(node.background);
        }

        // 显示角色
        if (node.character) {
            this.showCharacter(node.character);
        } else {
            this.hideAllCharacters();
        }

        // 处理不同节点类型
        switch (node.type) {
            case NodeType.DIALOG:
            case NodeType.NARRATION:
                this.playDialog(node);
                break;
            case NodeType.CHOICE:
                this.playChoice(node);
                break;
            case NodeType.END:
                this.playEnding();
                break;
            default:
                this.next();
        }
    }

    /**
     * 播放对话
     */
    private playDialog(node: StoryNode) {
        const stateMachine = GameStateMachine.instance;
        stateMachine.changeState(GameState.DIALOG);
        stateMachine.setDialogState(DialogState.TYPING);

        // 设置说话者
        if (node.speaker) {
            this._speakerLabel.string = this.getSpeakerName(node.speaker);
            this._speakerLabel.node.active = true;
        } else {
            this._speakerLabel.node.active = false;
        }

        // 打字机效果
        this._currentText = node.content;
        this._displayedChars = 0;
        this._isTyping = true;
        
        // 显示对话框
        this._dialogBox.active = true;
        
        this.startTyping();
    }

    /**
     * 播放选项
     */
    private playChoice(node: StoryNode) {
        const stateMachine = GameStateMachine.instance;
        stateMachine.changeState(GameState.CHOICE);

        // 隐藏打字机，直接显示完整文本
        this._isTyping = false;
        this._contentLabel.string = this._currentText;

        // 筛选可用选项
        const availableChoices = node.choices?.filter(choice => {
            if (!choice.conditions) return true;
            return this.checkConditions(choice.conditions);
        }) || [];

        // 显示选项面板
        this.showChoices(availableChoices);
    }

    /**
     * 显示选项
     */
    private showChoices(choices: ChoiceData[]) {
        this._choicePanel.active = true;
        
        // TODO: 动态创建选项按钮
        // 触发选项显示事件
        this.emit('choicesShown', choices);
    }

    /**
     * 选择选项
     */
    selectChoice(choiceId: string) {
        const choice = this._currentNode.choices?.find(c => c.id === choiceId);
        if (!choice) return;

        // 应用选项效果
        if (choice.effects) {
            this.applyEffects(choice.effects);
        }

        // 好感度变化
        if (choice.favorChange) {
            for (const [charId, delta] of Object.entries(choice.favorChange)) {
                this.changeFavor(charId, delta);
            }
        }

        // 隐藏选项面板
        this._choicePanel.active = false;

        // 跳转到下一节点
        if (choice.next) {
            // 通知StorySystem加载下一节点
            this.emit('nodeSelected', choice.next);
        }
    }

    /**
     * 下一句/快进
     */
    next() {
        if (this._isTyping) {
            // 快进：直接显示完整文本
            this._isTyping = false;
            this._contentLabel.string = this._currentText;
            this._displayedChars = this._currentText.length;
            return;
        }

        // 已经是完整文本，进入下一节点
        if (this._currentNode.next) {
            this.emit('requestNode', this._currentNode.next);
        } else {
            // 没有下一节点，结束
            this.playEnding();
        }
    }

    /**
     * 打字机效果
     */
    private startTyping() {
        this._typingTimer = window.setInterval(() => {
            if (!this._isTyping) {
                this.clearTypingTimer();
                return;
            }

            this._displayedChars++;
            
            // 逐步显示文本
            const displayText = this._currentText.substring(0, this._displayedChars);
            this._contentLabel.string = this._speakerLabel.node.active 
                ? displayText 
                : `<color=#888888>${displayText}</color>`;

            // 检查是否完成
            if (this._displayedChars >= this._currentText.length) {
                this.onTypingComplete();
            }
        }, this._typingSpeed);
    }

    /**
     * 打字完成
     */
    private onTypingComplete() {
        this.clearTypingTimer();
        this._isTyping = false;
        
        const stateMachine = GameStateMachine.instance;
        stateMachine.setDialogState(DialogState.COMPLETE);

        // 如果有选项，自动显示
        if (this._currentNode.choices && this._currentNode.choices.length > 0) {
            setTimeout(() => this.playChoice(this._currentNode), 500);
        }

        // 自动播放模式
        if (this._autoMode) {
            setTimeout(() => this.next(), this._autoDelay);
        }

        this.emit('typingComplete');
    }

    private clearTypingTimer() {
        if (this._typingTimer) {
            clearInterval(this._typingTimer);
            this._typingTimer = 0;
        }
    }

    /**
     * 切换背景
     */
    private changeBackground(bgName: string) {
        // TODO: 加载并切换背景
        console.log(`[DialogSystem] 切换背景: ${bgName}`);
        this.emit('backgroundChanged', bgName);
    }

    /**
     * 显示角色
     */
    private showCharacter(display: CharacterDisplay) {
        // TODO: 加载角色立绘
        console.log(`[DialogSystem] 显示角色: ${display.id} - ${display.pose}`);
        this.emit('characterShown', display);
    }

    /**
     * 隐藏所有角色
     */
    private hideAllCharacters() {
        this.emit('allCharactersHidden');
    }

    /**
     * 播放结局
     */
    private playEnding() {
        const stateMachine = GameStateMachine.instance;
        stateMachine.changeState(GameState.ENDING);
        
        this._dialogBox.active = false;
        this._choicePanel.active = false;
        
        this.emit('endingTriggered');
    }

    /**
     * 应用效果
     */
    private applyEffects(effects: Effect[]) {
        for (const effect of effects) {
            switch (effect.type) {
                case 'favor':
                    this.changeFavor(effect.target, effect.value);
                    break;
                case 'flag':
                    this.setFlag(effect.target, effect.value);
                    break;
                case 'unlock':
                    this.unlockContent(effect.target);
                    break;
            }
        }
    }

    /**
     * 好感度变化
     */
    private changeFavor(characterId: string, delta: number) {
        console.log(`[DialogSystem] 好感度变化: ${characterId} ${delta > 0 ? '+' : ''}${delta}`);
        this.emit('favorChanged', { characterId, delta });
    }

    /**
     * 设置标志位
     */
    private setFlag(flag: string, value: boolean) {
        console.log(`[DialogSystem] 设置标志位: ${flag} = ${value}`);
        this.emit('flagSet', { flag, value });
    }

    /**
     * 解锁内容
     */
    private unlockContent(contentId: string) {
        console.log(`[DialogSystem] 解锁内容: ${contentId}`);
        this.emit('contentUnlocked', contentId);
    }

    /**
     * 检查条件
     */
    private checkConditions(conditions: Condition[]): boolean {
        // TODO: 实现条件检查
        return true;
    }

    /**
     * 获取说话者名称
     */
    private getSpeakerName(speakerId: string): string {
        // TODO: 从角色配置中获取名称
        const names: Record<string, string> = {
            'player': '我',
            'heroine_1': '林雨晴',
            'heroine_2': '苏小晚',
            'heroine_3': '沈墨寒',
        };
        return names[speakerId] || speakerId;
    }

    /**
     * 设置自动播放
     */
    setAutoMode(enabled: boolean, delay: number = 2000) {
        this._autoMode = enabled;
        this._autoDelay = delay;
    }

    /**
     * 设置打字速度
     */
    setTypingSpeed(speed: number) {
        this._typingSpeed = speed;
    }

    /**
     * 跳过未读
     */
    skipUnread(enabled: boolean) {
        // TODO: 实现跳过未读
    }

    /**
     * 暂停
     */
    pause() {
        if (this._isTyping) {
            this.clearTypingTimer();
        }
    }

    /**
     * 恢复
     */
    resume() {
        if (this._isTyping && this._displayedChars < this._currentText.length) {
            this.startTyping();
        }
    }
}
