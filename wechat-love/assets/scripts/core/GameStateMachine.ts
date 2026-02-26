/**
 * 游戏状态机 - 恋爱养成微信小游戏
 * 评估：状态机非常适合此类游戏
 * 
 * 理由：
 * 1. 状态清晰：菜单/游戏中/对话/选项/设置等
 * 2. 分支明确：剧情选择、场景切换
 * 3. 易于扩展：新功能只需添加状态
 * 4. 维护简单：状态逻辑集中管理
 */

import { _decorator, Component, Node } from 'cc';
import { EventEmitter } from './EventEmitter';

export enum GameState {
    // 启动流程
    BOOT = 'boot',
    TITLE = 'title',
    MAIN_MENU = 'main_menu',
    
    // 游戏流程
    PLAYING = 'playing',
    DIALOG = 'dialog',           // 对话中
    CHOICE = 'choice',          // 选项选择中
    EVENT = 'event',            // 事件演出中
    DATE = 'date',              // 约会中
    
    // 暂停/菜单
    PAUSE = 'pause',
    INVENTORY = 'inventory',    // 背包
    CHARACTER = 'character',    // 角色菜单
    MAP = 'map',                // 地图
    
    // 系统
    SETTINGS = 'settings',
    SAVE_LOAD = 'save_load',
    GALLERY = 'gallery',        // CG画廊
    ACHIEVEMENT = 'achievement',
    
    // 结束
    ENDING = 'ending',
    CREDITS = 'credits',
}

export enum MenuState {
    /** 主菜单 */
    MAIN = 'main',
    /** 新游戏 */
    NEW_GAME = 'new_game',
    /** 继续游戏 */
    CONTINUE = 'continue',
    /** 读取存档 */
    LOAD = 'load',
    /** 设置 */
    SETTINGS = 'settings',
    /** 画廊 */
    GALLERY = 'gallery',
    /** 退出确认 */
    EXIT = 'exit',
}

export enum DialogState {
    /** 等待输入 */
    WAITING = 'waiting',
    /** 打字中 */
    TYPING = 'typing',
    /** 播放完成 */
    COMPLETE = 'complete',
    /** 自动播放 */
    AUTO = 'auto',
    /** 快进模式 */
    SKIP = 'skip',
}

const STATE_TRANSITIONS: Record<GameState, GameState[]> = {
    // 启动流程
    [GameState.BOOT]: [GameState.TITLE],
    [GameState.TITLE]: [GameState.MAIN_MENU],
    [GameState.MAIN_MENU]: [
        GameState.PLAYING,
        GameState.SAVE_LOAD,
        GameState.SETTINGS,
        GameState.GALLERY,
    ],
    
    // 游戏流程
    [GameState.PLAYING]: [
        GameState.DIALOG,
        GameState.CHOICE,
        GameState.EVENT,
        GameState.DATE,
        GameState.PAUSE,
        GameState.INVENTORY,
        GameState.CHARACTER,
    ],
    [GameState.DIALOG]: [
        GameState.CHOICE,
        GameState.EVENT,
        GameState.PLAYING,
        GameState.ENDING,
    ],
    [GameState.CHOICE]: [
        GameState.DIALOG,
        GameState.EVENT,
        GameState.PLAYING,
    ],
    [GameState.EVENT]: [
        GameState.DIALOG,
        GameState.PLAYING,
        GameState.ENDING,
    ],
    [GameState.DATE]: [
        GameState.PLAYING,
        GameState.DIALOG,
    ],
    
    // 暂停/菜单
    [GameState.PAUSE]: [
        GameState.PLAYING,
        GameState.SAVE_LOAD,
        GameState.SETTINGS,
    ],
    [GameState.INVENTORY]: [GameState.PLAYING],
    [GameState.CHARACTER]: [GameState.PLAYING],
    [GameState.MAP]: [GameState.PLAYING],
    
    // 系统
    [GameState.SETTINGS]: [
        GameState.MAIN_MENU,
        GameState.PAUSE,
    ],
    [GameState.SAVE_LOAD]: [
        GameState.MAIN_MENU,
        GameState.PLAYING,
    ],
    [GameState.GALLERY]: [
        GameState.MAIN_MENU,
        GameState.PAUSE,
    ],
    [GameState.ACHIEVEMENT]: [
        GameState.MAIN_MENU,
        GameState.PAUSE,
    ],
    
    // 结束
    [GameState.ENDING]: [GameState.CREDITS, GameState.TITLE, GameState.MAIN_MENU],
    [GameState.CREDITS]: [GameState.TITLE],
};

/**
 * 游戏状态管理器
 */
export class GameStateMachine extends EventEmitter {
    private static _instance: GameStateMachine;
    public static get instance(): GameStateMachine {
        if (!GameStateMachine._instance) {
            GameStateMachine._instance = new GameStateMachine();
        }
        return GameStateMachine._instance;
    }

    private _currentState: GameState = GameState.BOOT;
    private _previousState: GameState = GameState.BOOT;
    private _menuState: MenuState = MenuState.MAIN;
    private _dialogState: DialogState = DialogState.WAITING;

    // 状态历史（用于返回）
    private _stateStack: GameState[] = [];

    private constructor() {
        super();
    }

    /** 获取当前状态 */
    get currentState(): GameState {
        return this._currentState;
    }

    /** 获取上一个状态 */
    get previousState(): GameState {
        return this._previousState;
    }

    /** 获取菜单状态 */
    get menuState(): MenuState {
        return this._menuState;
    }

    /** 获取对话框状态 */
    get dialogState(): DialogState {
        return this._dialogState;
    }

    /**
     * 切换游戏状态
     */
    changeState(newState: GameState, data?: any): boolean {
        // 检查状态转换是否合法
        if (!this.canTransition(newState)) {
            console.warn(`[StateMachine] 无法从 ${this._currentState} 转换到 ${newState}`);
            return false;
        }

        const oldState = this._currentState;
        this._previousState = oldState;
        this._currentState = newState;

        // 记录状态栈
        if (this.shouldPushToStack(oldState, newState)) {
            this._stateStack.push(oldState);
        }

        // 发送状态变更事件
        this.emit('stateChanged', {
            oldState,
            newState,
            data,
        });

        console.log(`[StateMachine] ${oldState} -> ${newState}`);
        return true;
    }

    /**
     * 检查状态转换是否合法
     */
    canTransition(targetState: GameState): boolean {
        const allowed = STATE_TRANSITIONS[this._currentState];
        return allowed?.includes(targetState) ?? false;
    }

    /**
     * 设置菜单状态
     */
    setMenuState(state: MenuState): void {
        this._menuState = state;
        this.emit('menuStateChanged', state);
    }

    /**
     * 设置对话框状态
     */
    setDialogState(state: DialogState): void {
        this._dialogState = state;
        this.emit('dialogStateChanged', state);
    }

    /**
     * 返回上一个状态
     */
    goBack(data?: any): boolean {
        if (this._stateStack.length === 0) {
            console.warn('[StateMachine] 无法返回，没有状态历史');
            return false;
        }

        const previousState = this._stateStack.pop()!;
        return this.changeState(previousState, data);
    }

    /**
     * 判断是否应该压入状态栈
     */
    private shouldPushToStack(from: GameState, to: GameState): boolean {
        // 这些状态切换需要记录，以便返回
        const pushStates = [
            [GameState.MAIN_MENU, GameState.PLAYING],
            [GameState.PLAYING, GameState.DIALOG],
            [GameState.PLAYING, GameState.CHOICE],
            [GameState.PLAYING, GameState.PAUSE],
            [GameState.PLAYING, GameState.INVENTORY],
            [GameState.PLAYING, GameState.CHARACTER],
            [GameState.PAUSE, GameState.SAVE_LOAD],
            [GameState.PAUSE, GameState.SETTINGS],
        ];

        return pushStates.some(([f, t]) => from === f && to === t);
    }

    /**
     * 检查当前是否在游戏中
     */
    isInGame(): boolean {
        return [
            GameState.PLAYING,
            GameState.DIALOG,
            GameState.CHOICE,
            GameState.EVENT,
            GameState.DATE,
        ].includes(this._currentState);
    }

    /**
     * 检查是否可存档
     */
    canSave(): boolean {
        return this.isInGame() || this._currentState === GameState.PAUSE;
    }

    /**
     * 检查是否可存档
     */
    canLoad(): boolean {
        return [
            GameState.MAIN_MENU,
            GameState.TITLE,
            GameState.PAUSE,
        ].includes(this._currentState);
    }

    /**
     * 重置状态机
     */
    reset(): void {
        this._currentState = GameState.BOOT;
        this._previousState = GameState.BOOT;
        this._menuState = MenuState.MAIN;
        this._dialogState = DialogState.WAITING;
        this._stateStack = [];
    }
}
