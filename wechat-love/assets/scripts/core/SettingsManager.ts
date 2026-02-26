/**
 * 设置系统 - SettingsManager
 * 负责游戏设置的管理和持久化
 */

import { EventEmitter } from './EventEmitter';

// 设置数据类型
export interface GameSettings {
    // 音量
    musicVolume: number;
    sfxVolume: number;
    voiceVolume: number;
    
    // 显示
    textSpeed: number;        // 打字速度 (ms)
    autoSpeed: number;        // 自动播放间隔 (ms)
    backgroundQuality: 'low' | 'medium' | 'high';
    
    // 功能
    skipUnread: boolean;     // 跳过未读
    autoSave: boolean;       // 自动存档
    autoSaveInterval: number; // 自动存档间隔(分钟)
    
    // 辅助
    screenShake: boolean;    // 屏幕震动
    textAnimation: boolean;  // 文字动画
    
    // 语言
    language: 'zh_CN' | 'en_US';
}

// 默认设置
const DEFAULT_SETTINGS: GameSettings = {
    // 音量
    musicVolume: 0.8,
    sfxVolume: 0.8,
    voiceVolume: 1.0,
    
    // 显示
    textSpeed: 50,
    autoSpeed: 3000,
    backgroundQuality: 'medium',
    
    // 功能
    skipUnread: false,
    autoSave: true,
    autoSaveInterval: 5,
    
    // 辅助
    screenShake: true,
    textAnimation: true,
    
    // 语言
    language: 'zh_CN',
};

const STORAGE_KEY = 'game_settings';

export class SettingsManager extends EventEmitter {
    private static _instance: SettingsManager;
    public static get instance(): SettingsManager {
        if (!SettingsManager._instance) {
            SettingsManager._instance = new SettingsManager();
        }
        return SettingsManager._instance;
    }

    // 当前设置
    private _settings: GameSettings;

    private constructor() {
        super();
        this._settings = { ...DEFAULT_SETTINGS };
    }

    /**
     * 初始化
     */
    init() {
        this.load();
        console.log('[SettingsManager] 初始化完成');
    }

    /**
     * 加载设置
     */
    load() {
        try {
            // const data = wx.getStorageSync(STORAGE_KEY);
            const data = localStorage.getItem(STORAGE_KEY);
            
            if (data) {
                const saved = JSON.parse(data);
                this._settings = { ...DEFAULT_SETTINGS, ...saved };
            }
        } catch (e) {
            console.warn('[SettingsManager] 加载设置失败，使用默认');
            this._settings = { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * 保存设置
     */
    save() {
        try {
            const data = JSON.stringify(this._settings);
            // wx.setStorageSync(STORAGE_KEY, data);
            localStorage.setItem(STORAGE_KEY, data);
            
            console.log('[SettingsManager] 设置已保存');
            this.emit('settingsSaved', this._settings);
        } catch (e) {
            console.error('[SettingsManager] 保存设置失败', e);
        }
    }

    // ==================== 获取设置 ====================

    /**
     * 获取所有设置
     */
    getAll(): GameSettings {
        return { ...this._settings };
    }

    /**
     * 获取单个设置
     */
    get<K extends keyof GameSettings>(key: K): GameSettings[K] {
        return this._settings[key];
    }

    // ==================== 修改设置 ====================

    /**
     * 修改设置
     */
    set<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
        const oldValue = this._settings[key];
        
        if (oldValue === value) return;

        this._settings[key] = value;
        
        console.log(`[SettingsManager] ${key}: ${oldValue} -> ${value}`);
        
        // 应用设置
        this.applySetting(key, value);
        
        // 发送事件
        this.emit('settingChanged', { key, oldValue, newValue: value });
        
        // 自动保存
        this.save();
    }

    /**
     * 批量修改设置
     */
    setMultiple(settings: Partial<GameSettings>) {
        for (const [key, value] of Object.entries(settings)) {
            this.set(key as keyof GameSettings, value as any);
        }
    }

    /**
     * 应用单个设置
     */
    private applySetting(key: keyof GameSettings, value: any) {
        switch (key) {
            case 'musicVolume':
                // AudioManager.instance.setMusicVolume(value);
                break;
            case 'sfxVolume':
                // AudioManager.instance.setSFXVolume(value);
                break;
            case 'textSpeed':
                // DialogSystem.instance.setTypingSpeed(value);
                break;
            case 'autoSpeed':
                // DialogSystem.instance.setAutoDelay(value);
                break;
            case 'language':
                // I18nManager.instance.setLanguage(value);
                break;
        }
    }

    // ==================== 快捷方法 ====================

    /**
     * 重置为默认
     */
    reset() {
        this._settings = { ...DEFAULT_SETTINGS };
        this.save();
        console.log('[SettingsManager] 已重置为默认');
        this.emit('settingsReset');
    }

    /**
     * 静音切换
     */
    toggleMute(): boolean {
        const isMuted = this._settings.musicVolume === 0;
        
        if (isMuted) {
            // 恢复音量
            this.set('musicVolume', 0.8);
            this.set('sfxVolume', 0.8);
        } else {
            // 静音
            this.set('musicVolume', 0);
            this.set('sfxVolume', 0);
        }
        
        return !isMuted;
    }

    /**
     * 获取音量设置（用于UI显示）
     */
    getVolumeSettings() {
        return {
            music: this._settings.musicVolume,
            sfx: this._settings.sfxVolume,
            voice: this._settings.voiceVolume,
        };
    }

    /**
     * 导出设置
     */
    export(): string {
        return JSON.stringify(this._settings, null, 2);
    }

    /**
     * 导入设置
     */
    import(json: string): boolean {
        try {
            const data = JSON.parse(json);
            this.setMultiple(data);
            return true;
        } catch (e) {
            console.error('[SettingsManager] 导入设置失败', e);
            return false;
        }
    }
}

export const Settings = SettingsManager.instance;
