/**
 * 游戏主入口 - GameManager
 * 负责游戏整体初始化、流程控制、系统协调
 */

import { _decorator, Component, Node, director } from 'cc';

// 导出所有核心系统
export * from './core/index';

// 核心系统引用
import { EventEmitter } from './core/EventEmitter';
import { GameStateMachine, GameState } from './core/GameStateMachine';
import { DialogSystem } from './core/DialogSystem';
import { CharacterSystem } from './core/CharacterSystem';
import { SaveLoadSystem } from './core/SaveLoadSystem';
import { StoryManager } from './core/StoryManager';
import { AudioManager } from './core/AudioManager';
import { FlagManager } from './core/FlagManager';
import { ResourceManager } from './core/ResourceManager';
import { UIManager } from './core/UIManager';
import { InventorySystem } from './core/InventorySystem';
import { AchievementSystem } from './core/AchievementSystem';
import { WechatAdapter } from './core/WechatAdapter';
import { SettingsManager } from './core/SettingsManager';

const { ccclass, property } = _decorator;

/**
 * 游戏主入口
 * 单例模式，协调所有系统
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager;
    public static get instance(): GameManager {
        return GameManager._instance;
    }

    // 核心系统
    public stateMachine: GameStateMachine;
    public dialog: DialogSystem;
    public characters: CharacterSystem;
    public saveLoad: SaveLoadSystem;
    public story: StoryManager;
    public audio: AudioManager;
    public flags: FlagManager;
    public resources: ResourceManager;
    public ui: UIManager;
    public inventory: InventorySystem;
    public achievements: AchievementSystem;
    public wechat: WechatAdapter;
    public settings: SettingsManager;

    // 游戏状态
    private _initialized: boolean = false;
    private _isPaused: boolean = false;

    private constructor() {
        super();

        // 创建单例
        GameManager._instance = this;

        // 初始化所有系统
        this.stateMachine = GameStateMachine.instance;
        this.dialog = DialogSystem.instance;
        this.characters = CharacterSystem.instance;
        this.saveLoad = SaveLoadSystem.instance;
        this.story = StoryManager.instance;
        this.audio = AudioManager.instance;
        this.flags = FlagManager.instance;
        this.resources = ResourceManager.instance;
        this.ui = UIManager.instance;
        this.inventory = InventorySystem.instance;
        this.achievements = AchievementSystem.instance;
        this.wechat = WechatAdapter.instance;
        this.settings = SettingsManager.instance;
    }

    /**
     * 初始化游戏
     */
    async init(): Promise<void> {
        if (this._initialized) {
            console.warn('[GameManager] 游戏已初始化');
            return;
        }

        console.log('[GameManager] ===== 游戏初始化开始 =====');

        try {
            // 1. 平台适配
            this.wechat.init();

            // 2. 设置系统
            this.settings.init();

            // 3. 资源加载
            await this.resources.init();

            // 4. 音频系统
            await this.audio.init();

            // 5. 存档系统
            this.saveLoad.init();

            // 6. 角色系统
            await this.characters.init();

            // 7. 剧情系统
            await this.story.init();

            // 8. 背包系统
            this.inventory.init();

            // 9. 成就系统
            this.achievements.init();

            // 10. 标志位系统
            this.flags.init();

            // 11. UI系统
            // this.ui.init(this.node);

            // 12. 设置事件监听
            this.setupEventListeners();

            this._initialized = true;
            console.log('[GameManager] ===== 游戏初始化完成 =====');

            // 13. 开始游戏流程
            this.startGameFlow();

        } catch (error) {
            console.error('[GameManager] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置事件监听
     */
    private setupEventListeners() {
        // 游戏状态变化
        this.stateMachine.on('stateChanged', ({ oldState, newState }) => {
            console.log(`[GameManager] 状态变化: ${oldState} -> ${newState}`);
            
            // 根据状态调整
            if (newState === GameState.PAUSE) {
                this.pause();
            } else if (oldState === GameState.PAUSE) {
                this.resume();
            }
        });

        // 好感度变化
        this.characters.on('favorChanged', ({ characterId, delta }) => {
            if (delta > 0) {
                this.audio.playFavorUp();
            }
        });

        // 成就解锁
        this.achievements.on('achievementUnlocked', ({ def }) => {
            this.ui.showToast(`🏆 成就解锁: ${def.name}`);
            this.audio.playUnlock();
        });

        // 存档保存
        this.saveLoad.on('saveSuccess', () => {
            this.ui.showToast('💾 存档成功');
        });

        // 微信后台/前台
        this.wechat.on('show', () => {
            this.resume();
        });

        this.wechat.on('hide', () => {
            this.pause();
            this.saveLoad.autoSave();
        });
    }

    /**
     * 开始游戏流程
     */
    private startGameFlow() {
        // 切换到标题画面
        this.stateMachine.changeState(GameState.TITLE);
        
        // 播放标题音乐
        this.audio.playBGM('bgm_title');
    }

    /**
     * 开始新游戏
     */
    async startNewGame() {
        console.log('[GameManager] 开始新游戏');

        // 重置所有系统
        this.resetGameData();

        // 切换状态
        this.stateMachine.changeState(GameState.PLAYING);

        // 开始第一章
        await this.story.playChapter('ch00');

        // 关闭主菜单
        this.ui.close('MainMenu');

        console.log('[GameManager] 新游戏开始');
    }

    /**
     * 继续游戏
     */
    async continueGame(slot: number) {
        console.log(`[GameManager] 继续游戏: 槽位 ${slot}`);

        const data = this.saveLoad.load(slot);
        if (!data) {
            console.error('[GameManager] 读档失败');
            return;
        }

        // 恢复游戏数据
        this.applySaveData(data);

        // 切换状态
        this.stateMachine.changeState(GameState.PLAYING);

        // 跳转到保存的进度
        await this.story.jumpTo(data.chapter, data.node);

        // 关闭读档界面
        this.ui.close('SaveLoad');

        console.log('[GameManager] 继续游戏完成');
    }

    /**
     * 暂停游戏
     */
    pause() {
        if (this._isPaused) return;

        this._isPaused = true;
        
        // 暂停音频
        this.audio.pauseBGM();
        
        // 暂停对话
        this.dialog.pause();

        console.log('[GameManager] 游戏暂停');
    }

    /**
     * 恢复游戏
     */
    resume() {
        if (!this._isPaused) return;

        this._isPaused = false;
        
        // 恢复音频
        this.audio.resumeBGM();
        
        // 恢复对话
        this.dialog.resume();

        console.log('[GameManager] 游戏恢复');
    }

    /**
     * 保存游戏
     */
    async saveGame(slot: number): Promise<boolean> {
        return await this.saveLoad.save(slot);
    }

    /**
     * 加载游戏
     */
    async loadGame(slot: number): Promise<boolean> {
        const data = this.saveLoad.load(slot);
        if (!data) return false;

        this.applySaveData(data);
        return true;
    }

    /**
     * 应用存档数据
     */
    private applySaveData(data: any) {
        // 恢复角色数据
        if (data.characters) {
            this.characters.importData(data.characters);
        }

        // 恢复标志位
        if (data.flags) {
            this.flags.importData(data.flags);
        }

        // 恢复背包
        if (data.inventory) {
            this.inventory.importData(data.inventory);
        }

        // 恢复成就
        if (data.achievements) {
            this.achievements.importData(data.achievements);
        }
    }

    /**
     * 重置游戏数据
     */
    private resetGameData() {
        this.characters.reset();
        this.flags.reset();
        this.inventory.reset();
        this.achievements.reset();
        this.story.reset();
        this.saveLoad.startPlayTime();
    }

    /**
     * 退出游戏
     */
    exitGame() {
        // 自动存档
        this.saveLoad.autoSave();

        // 延迟退出（等待存档完成）
        setTimeout(() => {
            if (this.wechat.isWechat) {
                // wx.exitMiniProgram();
            } else {
                // 模拟退出
                console.log('[GameManager] 退出游戏');
            }
        }, 500);
    }

    /**
     * 更新
     */
    update(deltaTime: number) {
        // 定期自动存档
        if (this._initialized && !this._isPaused) {
            // 可以在这里检查是否需要自动存档
        }
    }

    // ==================== 便捷方法 ====================

    /**
     * 显示主菜单
     */
    async showMainMenu() {
        await this.ui.open('MainMenu');
        this.audio.playBGM('bgm_title');
    }

    /**
     * 显示设置
     */
    async showSettings() {
        await this.ui.open('Settings');
    }

    /**
     * 显示存档/读档
     */
    async showSaveLoad(mode: 'save' | 'load') {
        await this.ui.open('SaveLoad', { data: { mode } });
    }

    /**
     * 触发结局
     */
    async triggerEnding(endingId: string) {
        console.log(`[GameManager] 触发结局: ${endingId}`);
        
        this.stateMachine.changeState(GameState.ENDING);
        
        // 播放结局动画
        // ...
        
        // 返回标题
        setTimeout(() => {
            this.stateMachine.changeState(GameState.TITLE);
            this.showMainMenu();
        }, 5000);
    }
}

// 导出游戏实例
export const Game = GameManager.instance;
