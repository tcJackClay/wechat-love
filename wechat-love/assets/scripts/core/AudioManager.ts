/**
 * 音频系统 - AudioManager
 * 负责背景音乐、音效、语音的播放与管理
 */

import { _decorator, Component, AudioSource, AudioClip } from 'cc';

const { ccclass, property } = _decorator;

export enum AudioType {
    BGM = 'bgm',
    SFX = 'sfx',
    VOICE = 'voice',
    AMBIENT = 'ambient',
}

export interface AudioConfig {
    name: string;
    type: AudioType;
    resource: string;
    volume?: number;
    loop?: boolean;
    fade?: boolean;
    fadeDuration?: number;
}

@ccclass('AudioManager')
export class AudioManager {
    private static _instance: AudioManager;
    public static get instance(): AudioManager {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    // 音量设置
    private _musicVolume: number = 0.8;
    private _sfxVolume: number = 0.8;
    private _voiceVolume: number = 1.0;

    // 播放状态
    private _currentBGM: string = '';
    private _isMuted: boolean = false;

    // 音频资源缓存
    private _audioCache: Map<string, AudioClip> = new Map();

    // 预加载列表
    private _preloadList: AudioConfig[] = [
        // BGM
        { name: 'bgm_title', type: AudioType.BGM, resource: 'resources/bgm/title', loop: true },
        { name: 'bgm_chapter_0', type: AudioType.BGM, resource: 'resources/bgm/chapter_0', loop: true },
        { name: 'bgm_chapter_1', type: AudioType.BGM, resource: 'resources/bgm/chapter_1', loop: true },
        { name: 'bgm_date', type: AudioType.BGM, resource: 'resources/bgm/date', loop: true },
        { name: 'bgm_ending', type: AudioType.BGM, resource: 'resources/bgm/ending', loop: false },

        // SFX
        { name: 'sfx_dialog_next', type: AudioType.SFX, resource: 'resources/sfx/dialog_next' },
        { name: 'sfx_choice_select', type: AudioType.SFX, resource: 'resources/sfx/choice_select' },
        { name: 'sfx_favor_up', type: AudioType.SFX, resource: 'resources/sfx/favor_up' },
        { name: 'sfx_unlock', type: AudioType.SFX, resource: 'resources/sfx/unlock' },
        { name: 'sfx_button', type: AudioType.SFX, resource: 'resources/sfx/button' },
    ];

    private constructor() {}

    /**
     * 初始化音频系统
     */
    async init() {
        // 预加载音频
        await this.preloadAll();
        
        // 加载音量设置
        this.loadVolumeSettings();
        
        console.log('[AudioManager] 初始化完成');
    }

    /**
     * 预加载所有音频
     */
    async preloadAll() {
        const promises = this._preloadList.map(config => this.preload(config));
        await Promise.all(promises);
        console.log(`[AudioManager] 预加载完成: ${this._preloadList.length}个音频`);
    }

    /**
     * 预加载单个音频
     */
    async preload(config: AudioConfig): Promise<AudioClip | null> {
        // TODO: 使用Cocos Resources加载
        // const clip = await Resources.load(config.resource, AudioClip);
        // this._audioCache.set(config.name, clip);
        // return clip;
        
        return null;
    }

    // ==================== BGM播放 ====================

    /**
     * 播放背景音乐
     */
    playBGM(name: string, fade: boolean = true) {
        if (this._currentBGM === name) return;
        
        const config = this._preloadList.find(a => a.name === name);
        if (!config) {
            console.warn(`[AudioManager] 未找到BGM: ${name}`);
            return;
        }

        const clip = this._audioCache.get(name);
        
        if (fade && this._currentBGM) {
            // 淡入淡出
            this.crossFade(name, clip, config.loop ?? true);
        } else {
            this._currentBGM = name;
            // TODO: 播放音频
            console.log(`[AudioManager] 播放BGM: ${name}`);
        }
    }

    /**
     * 停止BGM
     */
    stopBGM(fade: boolean = true) {
        if (!this._currentBGM) return;

        if (fade) {
            // 淡出
            setTimeout(() => {
                this._currentBGM = '';
                // TODO: 停止播放
            }, 1000);
        } else {
            this._currentBGM = '';
            // TODO: 立即停止
        }
    }

    /**
     * 暂停BGM
     */
    pauseBGM() {
        // TODO: 暂停当前BGM
    }

    /**
     * 恢复BGM
     */
    resumeBGM() {
        // TODO: 恢复BGM播放
    }

    /**
     * 切换BGM（淡入淡出）
     */
    private crossFade(newName: string, newClip: AudioClip | null, loop: boolean) {
        // 1. 淡出当前BGM (1秒)
        // 2. 淡入新BGM
        
        console.log(`[AudioManager] BGM切换: ${this._currentBGM} -> ${newName}`);
        
        this._currentBGM = newName;
        
        // TODO: 实现完整的淡入淡出
    }

    // ==================== 音效播放 ====================

    /**
     * 播放音效
     */
    playSFX(name: string, volumeScale: number = 1.0) {
        if (this._isMuted) return;

        const config = this._preloadList.find(a => a.name === name);
        if (!config) {
            console.warn(`[AudioManager] 未找到SFX: ${name}`);
            return;
        }

        const clip = this._audioCache.get(name);
        const volume = this._sfxVolume * volumeScale;

        // TODO: 播放音效（支持重叠播放）
        console.log(`[AudioManager] 播放SFX: ${name} (vol: ${volume})`);
    }

    /**
     * 播放对话快进音效
     */
    playDialogNext() {
        this.playSFX('sfx_dialog_next', 0.5);
    }

    /**
     * 播放选项选择音效
     */
    playChoiceSelect() {
        this.playSFX('sfx_choice_select', 0.7);
    }

    /**
     * 播放好感度提升音效
     */
    playFavorUp() {
        this.playSFX('sfx_favor_up', 1.0);
    }

    /**
     * 播放解锁音效
     */
    playUnlock() {
        this.playSFX('sfx_unlock', 1.0);
    }

    /**
     * 播放按钮点击音效
     */
    playButtonClick() {
        this.playSFX('sfx_button', 0.5);
    }

    // ==================== 语音播放 ====================

    /**
     * 播放语音
     */
    playVoice(voiceId: string) {
        if (this._isMuted) return;

        // 语音资源命名: heroine_1_ch01_01
        const name = `voice_${voiceId}`;
        
        // TODO: 播放语音
        console.log(`[AudioManager] 播放语音: ${voiceId}`);
    }

    /**
     * 停止语音
     */
    stopVoice() {
        // TODO: 停止当前语音
    }

    // ==================== 音量控制 ====================

    /**
     * 设置音乐音量
     */
    setMusicVolume(volume: number) {
        this._musicVolume = Math.max(0, Math.min(1, volume));
        this.saveVolumeSettings();
        
        // TODO: 应用到当前BGM
    }

    /**
     * 获取音乐音量
     */
    getMusicVolume(): number {
        return this._musicVolume;
    }

    /**
     * 设置音效音量
     */
    setSFXVolume(volume: number) {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveVolumeSettings();
    }

    /**
     * 获取音效音量
     */
    getSFXVolume(): number {
        return this._sfxVolume;
    }

    /**
     * 设置语音音量
     */
    setVoiceVolume(volume: number) {
        this._voiceVolume = Math.max(0, Math.min(1, volume));
        this.saveVolumeSettings();
    }

    /**
     * 获取语音音量
     */
    getVoiceVolume(): number {
        return this._voiceVolume;
    }

    /**
     * 静音/取消静音
     */
    toggleMute(): boolean {
        this._isMuted = !this._isMuted;
        
        if (this._isMuted) {
            this.pauseBGM();
        } else {
            this.resumeBGM();
        }
        
        return this._isMuted;
    }

    /**
     * 是否静音
     */
    isMuted(): boolean {
        return this._isMuted;
    }

    // ==================== 设置持久化 ====================

    /**
     * 保存音量设置
     */
    private saveVolumeSettings() {
        const settings = {
            musicVolume: this._musicVolume,
            sfxVolume: this._sfxVolume,
            voiceVolume: this._voiceVolume,
        };
        
        // wx.setStorageSync('audio_settings', JSON.stringify(settings));
        localStorage.setItem('audio_settings', JSON.stringify(settings));
    }

    /**
     * 加载音量设置
     */
    private loadVolumeSettings() {
        try {
            // const data = wx.getStorageSync('audio_settings');
            const data = localStorage.getItem('audio_settings');
            if (data) {
                const settings = JSON.parse(data);
                this._musicVolume = settings.musicVolume ?? 0.8;
                this._sfxVolume = settings.sfxVolume ?? 0.8;
                this._voiceVolume = settings.voiceVolume ?? 1.0;
            }
        } catch (e) {
            console.warn('[AudioManager] 加载音量设置失败');
        }
    }

    // ==================== 工具方法 ====================

    /**
     * 释放所有音频资源
     */
    releaseAll() {
        for (const clip of this._audioCache.values()) {
            // clip.destroy();
        }
        this._audioCache.clear();
        
        console.log('[AudioManager] 释放所有音频资源');
    }

    /**
     * 获取当前BGM名称
     */
    getCurrentBGM(): string {
        return this._currentBGM;
    }
}

// 导出单例
export const Audio = AudioManager.instance;
