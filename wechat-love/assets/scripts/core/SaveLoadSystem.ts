/**
 * 存档系统 - SaveLoadSystem
 * 负责游戏存档、读档、自动存档功能
 */

import { _decorator, Component, Node } from 'cc';
import { EventEmitter } from './EventEmitter';
import { CharacterSystem } from './CharacterSystem';
import { GameStateMachine, GameState } from './GameStateMachine';

const { ccclass, property } = _decorator;

// 存档数据
export interface SaveData {
    // 存档信息
    slot: number;
    version: string;
    saveTime: number;

    // 进度数据
    chapter: string;
    node: string;

    // 角色状态
    characters: Record<string, {
        favor: number;
        unlocked: boolean;
        endings: string[];
        events: string[];
    }>;

    // 标志位
    flags: Record<string, boolean>;

    // 玩家数据
    player: {
        playTime: number;
        choices: string[];
        name?: string;
        attributes?: Record<string, number>;
    };

    // 附加数据
    extra: Record<string, any>;

    // 缩略图（base64）
    thumbnail?: string;

    // 设置数据
    autoSave?: boolean;
    autoSaveInterval?: number;
}

// 存档简要信息
export interface SaveInfo {
    slot: number;
    chapter: string;
    chapterName: string;
    playTime: string;
    saveDate: string;
    saveTime: number;
    hasData: boolean;
}

// 存储键名
const STORAGE_KEYS = {
    SAVE_PREFIX: 'save_',     // save_0 ~ save_5
    PLAYER_DATA: 'player_data',
    SETTINGS: 'game_settings',
    GAME_CONFIG: 'game_config',
};

// 游戏版本
const GAME_VERSION = '1.0.0';

@ccclass('SaveLoadSystem')
export class SaveLoadSystem extends EventEmitter {
    private static _instance: SaveLoadSystem;
    public static get instance(): SaveLoadSystem {
        if (!SaveLoadSystem._instance) {
            SaveLoadSystem._instance = new SaveLoadSystem();
        }
        return SaveLoadSystem._instance;
    }

    // 存档槽位数量
    readonly MAX_SLOTS: number = 6;

    // 当前存档槽位
    private _currentSlot: number = -1;

    // 自动存档配置
    private _autoSaveEnabled: boolean = true;
    private _autoSaveInterval: number = 5 * 60 * 1000; // 5分钟
    private _lastAutoSaveTime: number = 0;

    // 自动存档节点ID
    private _autoSaveNode: string = '';

    // 是否正在存档
    private _isSaving: boolean = false;

    private constructor() {
        super();
    }

    /**
     * 初始化存档系统
     */
    init() {
        // 加载设置
        this.loadSettings();
        
        console.log('[SaveLoadSystem] 初始化完成');
    }

    // ==================== 存档操作 ====================

    /**
     * 保存存档
     */
    async save(slot: number, data?: Partial<SaveData>): Promise<boolean> {
        if (this._isSaving) {
            console.warn('[SaveLoadSystem] 正在保存中...');
            return false;
        }

        if (slot < 0 || slot >= this.MAX_SLOTS) {
            console.error(`[SaveLoadSystem] 无效的存档槽位: ${slot}`);
            return false;
        }

        this._isSaving = true;

        try {
            // 收集当前游戏数据
            const saveData = this.collectSaveData(slot, data);

            // 生成缩略图
            // TODO: 截图功能
            // saveData.thumbnail = await this.captureThumbnail();

            // 保存到存储
            const key = `${STORAGE_KEYS.SAVE_PREFIX}${slot}`;
            this.setStorage(key, saveData);

            this._currentSlot = slot;
            
            console.log(`[SaveLoadSystem] 存档成功: 槽位 ${slot}`);
            this.emit('saveSuccess', { slot, data: saveData });
            
            return true;
        } catch (error) {
            console.error('[SaveLoadSystem] 存档失败:', error);
            this.emit('saveFailed', { slot, error });
            return false;
        } finally {
            this._isSaving = false;
        }
    }

    /**
     * 读取存档
     */
    load(slot: number): SaveData | null {
        if (slot < 0 || slot >= this.MAX_SLOTS) {
            console.error(`[SaveLoadSystem] 无效的存档槽位: ${slot}`);
            return null;
        }

        const key = `${STORAGE_KEYS.SAVE_PREFIX}${slot}`;
        const data = this.getStorage(key);

        if (!data) {
            console.log(`[SaveLoadSystem] 槽位 ${slot} 为空`);
            return null;
        }

        // 验证版本兼容性
        if (!this.checkVersion(data.version)) {
            console.warn(`[SaveLoadSystem] 存档版本 ${data.version} 与当前版本 ${GAME_VERSION} 不兼容`);
            // TODO: 版本迁移
        }

        this._currentSlot = slot;
        
        console.log(`[SaveLoadSystem] 读档成功: 槽位 ${slot}`);
        this.emit('loadSuccess', { slot, data });
        
        return data;
    }

    /**
     * 删除存档
     */
    deleteSave(slot: number): boolean {
        if (slot < 0 || slot >= this.MAX_SLOTS) {
            return false;
        }

        const key = `${STORAGE_KEYS.SAVE_PREFIX}${slot}`;
        this.removeStorage(key);

        if (this._currentSlot === slot) {
            this._currentSlot = -1;
        }

        console.log(`[SaveLoadSystem] 删除存档: 槽位 ${slot}`);
        this.emit('saveDeleted', { slot });
        
        return true;
    }

    /**
     * 自动存档
     */
    async autoSave(nodeId?: string): Promise<boolean> {
        if (!this._autoSaveEnabled) {
            return false;
        }

        // 检查时间间隔
        const now = Date.now();
        if (now - this._lastAutoSaveTime < this._autoSaveInterval) {
            return false;
        }

        // 使用最近的槽位
        const slot = this._currentSlot >= 0 ? this._currentSlot : 0;
        
        this._lastAutoSaveTime = now;
        this._autoSaveNode = nodeId || '';

        const success = await this.save(slot, {
            chapter: nodeId || '',
        });

        if (success) {
            console.log('[SaveLoadSystem] 自动存档完成');
            this.emit('autoSaveSuccess', { slot });
        }

        return success;
    }

    /**
     * 收集存档数据
     */
    private collectSaveData(slot: number, extraData?: Partial<SaveData>): SaveData {
        const stateMachine = GameStateMachine.instance;
        const characterSystem = CharacterSystem.instance;

        return {
            slot,
            version: GAME_VERSION,
            saveTime: Date.now(),

            // 进度数据
            chapter: extraData?.chapter || stateMachine.currentState as any,
            node: extraData?.node || this._autoSaveNode,

            // 角色数据
            characters: characterSystem.exportData(),

            // 标志位
            flags: this.collectFlags(),

            // 玩家数据
            player: {
                playTime: (extraData?.player?.playTime || 0) + this.calculatePlayTime(),
                choices: extraData?.player?.choices || [],
                name: extraData?.player?.name || '李明',
                attributes: extraData?.player?.attributes || {
                    charm: 50,
                    intellect: 50,
                    luck: 50,
                    athletics: 50,
                },
            },

            // 附加数据
            extra: extraData?.extra || {},
        };
    }

    /**
     * 收集当前标志位
     */
    private collectFlags(): Record<string, boolean> {
        // TODO: 从FlagManager获取
        return {};
    }

    /**
     * 计算游玩时间
     */
    private _playStartTime: number = 0;

    startPlayTime() {
        this._playStartTime = Date.now();
    }

    calculatePlayTime(): number {
        if (this._playStartTime <= 0) return 0;
        return Math.floor((Date.now() - this._playStartTime) / 1000);
    }

    // ==================== 存档信息 ====================

    /**
     * 获取所有存档简要信息
     */
    getAllSaveInfo(): SaveInfo[] {
        const infos: SaveInfo[] = [];

        for (let i = 0; i < this.MAX_SLOTS; i++) {
            const info = this.getSaveInfo(i);
            infos.push(info);
        }

        return infos;
    }

    /**
     * 获取单个存档信息
     */
    getSaveInfo(slot: number): SaveInfo {
        const key = `${STORAGE_KEYS.SAVE_PREFIX}${slot}`;
        const data = this.getStorage(key);

        if (!data) {
            return {
                slot,
                chapter: '',
                chapterName: '空存档',
                playTime: '0:00',
                saveDate: '',
                saveTime: 0,
                hasData: false,
            };
        }

        return {
            slot,
            chapter: data.chapter || '',
            chapterName: this.getChapterName(data.chapter),
            playTime: this.formatPlayTime(data.player?.playTime || 0),
            saveDate: this.formatDate(data.saveTime),
            saveTime: data.saveTime,
            hasData: true,
        };
    }

    /**
     * 检查槽位是否有存档
     */
    hasSaveData(slot: number): boolean {
        const key = `${STORAGE_KEYS.SAVE_PREFIX}${slot}`;
        return this.hasStorage(key);
    }

    /**
     * 获取当前存档槽位
     */
    getCurrentSlot(): number {
        return this._currentSlot;
    }

    // ==================== 版本管理 ====================

    /**
     * 检查版本兼容性
     */
    private checkVersion(savedVersion: string): boolean {
        // 主版本一致即可
        const savedMajor = parseInt(savedVersion.split('.')[0]);
        const currentMajor = parseInt(GAME_VERSION.split('.')[0]);
        return savedMajor === currentMajor;
    }

    // ==================== 存储接口 ====================

    /**
     * 存储数据（微信API）
     */
    private setStorage(key: string, data: any) {
        try {
            const json = JSON.stringify(data);
            // 微信存储
            // wx.setStorageSync(key, json);
            
            // 模拟：使用localStorage
            localStorage.setItem(key, json);
        } catch (error) {
            console.error(`[SaveLoadSystem] 存储失败: ${key}`, error);
        }
    }

    /**
     * 获取存储数据
     */
    private getStorage(key: string): SaveData | null {
        try {
            // 微信存储
            // const json = wx.getStorageSync(key);
            
            // 模拟：使用localStorage
            const json = localStorage.getItem(key);
            if (!json) return null;
            
            return JSON.parse(json);
        } catch (error) {
            console.error(`[SaveLoadSystem] 读取失败: ${key}`, error);
            return null;
        }
    }

    /**
     * 检查存储是否存在
     */
    private hasStorage(key: string): boolean {
        // return wx.getStorageInfoSync().keys.includes(key);
        return localStorage.getItem(key) !== null;
    }

    /**
     * 删除存储
     */
    private removeStorage(key: string) {
        // wx.removeStorageSync(key);
        localStorage.removeItem(key);
    }

    // ==================== 设置 ====================

    /**
     * 加载设置
     */
    private loadSettings() {
        const key = STORAGE_KEYS.SETTINGS;
        const data = this.getStorage(key);
        
        if (data) {
            this._autoSaveEnabled = data.autoSave ?? true;
            this._autoSaveInterval = (data.autoSaveInterval || 5) * 60 * 1000;
        }
    }

    /**
     * 保存设置
     */
    saveSettings(settings: {
        autoSave?: boolean;
        autoSaveInterval?: number;
    }) {
        if (settings.autoSave !== undefined) {
            this._autoSaveEnabled = settings.autoSave;
        }
        if (settings.autoSaveInterval !== undefined) {
            this._autoSaveInterval = settings.autoSaveInterval * 60 * 1000;
        }

        const key = STORAGE_KEYS.SETTINGS;
        this.setStorage(key, {
            autoSave: this._autoSaveEnabled,
            autoSaveInterval: this._autoSaveInterval / 60 / 1000,
        });
    }

    /**
     * 设置自动存档
     */
    setAutoSave(enabled: boolean) {
        this._autoSaveEnabled = enabled;
        this.saveSettings({ autoSave: enabled });
    }

    // ==================== 工具方法 ====================

    /**
     * 格式化游玩时间
     */
    private formatPlayTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
        }
        return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    /**
     * 格式化日期
     */
    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        
        return `${month}月${day}日 ${hours}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * 获取章节名称
     */
    private getChapterName(chapterId: string): string {
        const names: Record<string, string> = {
            'ch00': '序章 - 入学第一天',
            'ch01': '第一章 - 新的邂逅',
            'ch02': '第二章 - 冰山融化',
        };
        return names[chapterId] || chapterId || '未知章节';
    }

    // ==================== 数据操作 ====================

    /**
     * 应用存档数据到游戏
     */
    applySaveData(data: SaveData): boolean {
        const characterSystem = CharacterSystem.instance;
        const stateMachine = GameStateMachine.instance;

        // 恢复角色数据
        if (data.characters) {
            characterSystem.importData(data.characters);
        }

        // 恢复标志位
        // TODO: FlagManager.importData(data.flags);

        // 恢复玩家数据
        if (data.player) {
            this._playStartTime = Date.now() - (data.player.playTime * 1000);
        }

        console.log(`[SaveLoadSystem] 应用存档数据: 章节 ${data.chapter}`);
        this.emit('dataApplied', data);
        
        return true;
    }

    /**
     * 清除所有存档
     */
    clearAllSaves(): void {
        for (let i = 0; i < this.MAX_SLOTS; i++) {
            this.deleteSave(i);
        }
        
        // 清除玩家数据
        this.removeStorage(STORAGE_KEYS.PLAYER_DATA);
        
        console.log('[SaveLoadSystem] 已清除所有存档');
        this.emit('allSavesCleared');
    }
}
