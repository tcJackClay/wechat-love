/**
 * 微信平台适配器 - WechatAdapter
 * 负责微信小游戏特有功能的适配
 */

import { EventEmitter } from './EventEmitter';

// 微信API类型声明
declare global {
    interface wx {
        // 生命周期
        getLaunchOptionsSync(): LaunchOptions;
        onShow(callback: (res: ShowOptions) => void): void;
        onHide(callback: () => void): void;

        // 存储
        setStorageSync(key: string, value: any): void;
        getStorageSync(key: string): any;
        getStorageInfoSync(): StorageInfo;
        removeStorageSync(key: string): void;

        // 用户信息
        getUserProfile(params: GetUserProfileParams): void;
        getUserInfo(params: GetUserInfoParams): void;
        login(params: LoginParams): void;

        // 分享
        shareAppMessage(params: ShareOptions): void;
        updateShareMenu(params: ShareMenuOptions): void;

        // 广告
        createBannerAd(params: BannerAdParams): BannerAd;
        createRewardedVideoAd(params: RewardedVideoAdParams): RewardedVideoAd;
        createInterstitialAd(params: InterstitialAdParams): InterstitialAd;

        // 性能
        reportPerformance(id: number, value: number): void;
        getPerformance(): Performance;

        // 振动
        vibrateShort(params?: { success?: () => void; fail?: () => void }): void;
        vibrateLong(params?: { success?: () => void; fail?: () => void }): void;

        // 设备
        getSystemInfoSync(): SystemInfo;
        getNetworkType(params: { success: (res: NetworkTypeRes) => void }): void;

        // 截图
        createGameRecorderManager(): GameRecorderManager;

        // 开放数据
        getOpenDataContext(): OpenDataContext;
    }
}

export interface LaunchOptions {
    query: Record<string, string>;
    scene: number;
    referrerInfo?: ReferrerInfo;
}

export interface ShowOptions {
    query: Record<string, string>;
    scene: number;
    referrerInfo?: ReferrerInfo;
}

export interface ReferrerInfo {
    appId: string;
    extraData?: Record<string, any>;
}

export interface StorageInfo {
    keys: string[];
    currentSize: number;
    keysSize: number;
}

export interface GetUserProfileParams {
    desc: string;
    success?: (res: any) => void;
    fail?: (res: any) => void;
}

export interface GetUserInfoParams {
    withCredentials?: boolean;
    lang?: string;
    success?: (res: UserInfoRes) => void;
    fail?: (res: any) => void;
}

export interface UserInfoRes {
    userInfo: UserInfo;
    errMsg: string;
}

export interface UserInfo {
    nickName: string;
    avatarUrl: string;
    gender: number;
    country: string;
    province: string;
    city: string;
}

export interface LoginParams {
    timeout?: number;
    success?: (res: LoginRes) => void;
    fail?: (res: any) => void;
}

export interface LoginRes {
    code: string;
    errMsg: string;
}

export interface ShareOptions {
    title?: string;
    imageUrl?: string;
    query?: string;
    imageUrlId?: string;
}

export interface ShareMenuOptions {
    withShareTicket?: boolean;
    success?: () => void;
    fail?: () => void;
}

export interface BannerAdParams {
    adUnitId: string;
    adIntervals?: number;
    style?: BannerStyle;
}

export interface BannerStyle {
    left: number;
    top: number;
    width: number;
    height?: number;
}

export interface BannerAd {
    show(): Promise<void>;
    hide(): void;
    destroy(): void;
    onLoad(callback: () => void): void;
    onError(callback: (res: { errMsg: string }) => void): void;
    onResize(callback: (res: { width: number; height: number }) => void): void;
}

export interface RewardedVideoAdParams {
    adUnitId: string;
}

export interface RewardedVideoAd {
    load(): Promise<void>;
    show(): Promise<void>;
    onLoad(callback: () => void): void;
    onError(callback: (res: { errMsg: string }) => void): void;
    onClose(callback: (res: { isEnded: boolean }) => void): void;
}

export interface InterstitialAdParams {
    adUnitId: string;
}

export interface InterstitialAd {
    load(): Promise<void>;
    show(): Promise<void>;
    onLoad(callback: () => void): void;
    onError(callback: (res: { errMsg: string }) => void): void;
    onClose(callback: () => void): void;
    destroy(): void;
}

export interface Performance {
    createObserver(callback: (res: PerformanceObserverResult) => void): PerformanceObserver;
}

export interface PerformanceObserverResult {
    entryType: string;
    entries: PerformanceEntry[];
}

export interface PerformanceEntry {
    name: string;
    entryType: string;
    duration: number;
}

export interface SystemInfo {
    brand: string;
    model: string;
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    language: string;
    version: string;
    platform: string;
}

export interface NetworkTypeRes {
    networkType: string;
}

export interface GameRecorderManager {
    start(options: RecorderOptions): void;
    stop(): void;
    pause(): void;
    resume(): void;
    onStart(callback: (res: { duration: number }) => void): void;
    onStop(callback: (res: { tempFilePath: string; duration: number }) => void): void;
    onError(callback: (res: { errMsg: string }) => void): void;
}

export interface RecorderOptions {
    duration?: number;
    sampleRate?: number;
    numberOfChannels?: number;
    encodeBitRate?: number;
    format?: string;
}

export interface OpenDataContext {
    canvas: any;
}

export class WechatAdapter extends EventEmitter {
    private static _instance: WechatAdapter;
    public static get instance(): WechatAdapter {
        if (!WechatAdapter._instance) {
            WechatAdapter._instance = new WechatAdapter();
        }
        return WechatAdapter._instance;
    }

    // 平台标识
    readonly isWechat: boolean;

    // 启动参数
    private _launchOptions: LaunchOptions = null!;

    // 用户信息
    private _userInfo: UserInfo = null!;

    // 广告实例
    private _bannerAd: BannerAd = null!;
    private _rewardedVideoAd: RewardedVideoAd = null!;

    // 广告位ID（需要替换为实际的）
    private readonly BANNER_AD_UNIT_ID = 'YOUR_BANNER_AD_UNIT_ID';
    private readonly REWARDED_VIDEO_AD_UNIT_ID = 'YOUR_REWARDED_VIDEO_AD_UNIT_ID';

    private constructor() {
        super();
        // this.isWechat = typeof wx !== 'undefined';
        this.isWechat = false; // 模拟环境
    }

    /**
     * 初始化
     */
    init() {
        if (!this.isWechat) {
            console.log('[WechatAdapter] 非微信环境，部分功能不可用');
            return;
        }

        this._launchOptions = wx.getLaunchOptionsSync();
        this.setupLifecycle();
        
        console.log('[WechatAdapter] 初始化完成');
    }

    /**
     * 设置生命周期监听
     */
    private setupLifecycle() {
        wx.onShow((res) => {
            console.log('[WechatAdapter] onShow');
            this.emit('show', res);
        });

        wx.onHide(() => {
            console.log('[WechatAdapter] onHide');
            this.emit('hide');
        });
    }

    // ==================== 用户信息 ====================

    /**
     * 获取用户信息
     */
    async getUserProfile(): Promise<UserInfo | null> {
        if (!this.isWechat) {
            // 模拟数据
            return {
                nickName: '玩家',
                avatarUrl: '',
                gender: 0,
                country: '',
                province: '',
                city: '',
            };
        }

        return new Promise((resolve) => {
            wx.getUserProfile({
                desc: '用于完善用户资料',
                success: (res) => {
                    this._userInfo = res.userInfo;
                    resolve(res.userInfo);
                },
                fail: () => {
                    resolve(null);
                },
            });
        });
    }

    // ==================== 分享 ====================

    /**
     * 分享
     */
    share(options: ShareOptions = {}) {
        if (!this.isWechat) {
            console.log('[WechatAdapter] 分享（模拟）:', options.title);
            return;
        }

        wx.shareAppMessage({
            title: options.title || '圣樱学院 - 恋爱养成',
            imageUrl: options.imageUrl || '',
            query: options.query || '',
        });
    }

    /**
     * 更新分享菜单
     */
    updateShareMenu(withShareTicket: boolean = true) {
        if (!this.isWechat) return;

        wx.updateShareMenu({
            withShareTicket,
        });
    }

    // ==================== 广告 ====================

    /**
     * 显示Banner广告
     */
    showBanner(): boolean {
        if (!this.isWechat) {
            console.log('[WechatAdapter] Banner广告（模拟）');
            return true;
        }

        if (this._bannerAd) {
            this._bannerAd.show();
            return true;
        }

        try {
            this._bannerAd = wx.createBannerAd({
                adUnitId: this.BANNER_AD_UNIT_ID,
                style: {
                    left: 0,
                    top: 0,
                    width: 300,
                },
            });

            this._bannerAd.onLoad(() => {
                console.log('[WechatAdapter] Banner加载成功');
            });

            this._bannerAd.onError((err) => {
                console.error('[WechatAdapter] Banner错误:', err);
            });

            this._bannerAd.show();
            return true;
        } catch (e) {
            console.error('[WechatAdapter] Banner创建失败:', e);
            return false;
        }
    }

    /**
     * 隐藏Banner广告
     */
    hideBanner() {
        if (this._bannerAd) {
            this._bannerAd.hide();
        }
    }

    /**
     * 销毁Banner广告
     */
    destroyBanner() {
        if (this._bannerAd) {
            this._bannerAd.destroy();
            this._bannerAd = null!;
        }
    }

    /**
     * 显示激励视频广告
     */
    async showRewardedVideo(): Promise<boolean> {
        if (!this.isWechat) {
            console.log('[WechatAdapter] 激励视频（模拟）');
            return true;
        }

        return new Promise((resolve) => {
            if (!this._rewardedVideoAd) {
                this._rewardedVideoAd = wx.createRewardedVideoAd({
                    adUnitId: this.REWARDED_VIDEO_AD_UNIT_ID,
                });
            }

            this._rewardedVideoAd.onLoad(() => {
                console.log('[WechatAdapter] 激励视频加载成功');
            });

            this._rewardedVideoAd.onError((err) => {
                console.error('[WechatAdapter] 激励视频错误:', err);
                resolve(false);
            });

            this._rewardedVideoAd.onClose((res) => {
                if (res.isEnded) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            this._rewardedVideoAd.show().catch(() => {
                this._rewardedVideoAd.load().then(() => {
                    this._rewardedVideoAd.show();
                });
            });
        });
    }

    // ==================== 性能监控 ====================

    /**
     * 上报性能数据
     */
    reportPerformance(key: string | number, value: number) {
        if (!this.isWechat) return;
        
        // 需要在微信后台配置性能监控
        // wx.reportPerformance(key, value);
    }

    // ==================== 设备 ====================

    /**
     * 获取系统信息
     */
    getSystemInfo(): SystemInfo | null {
        if (!this.isWechat) {
            return {
                brand: 'mock',
                model: 'mock',
                pixelRatio: 2,
                screenWidth: 375,
                screenHeight: 812,
                windowWidth: 375,
                windowHeight: 812,
                language: 'zh_CN',
                version: '1.0.0',
                platform: 'devtools',
            };
        }

        return wx.getSystemInfoSync();
    }

    /**
     * 振动
     */
    vibrateShort() {
        if (!this.isWechat) return;
        wx.vibrateShort();
    }

    vibrateLong() {
        if (!this.isWechat) return;
        wx.vibrateLong();
    }

    // ==================== 启动参数 ====================

    /**
     * 获取启动参数
     */
    getLaunchOptions(): LaunchOptions {
        return this._launchOptions;
    }

    /**
     * 获取启动场景
     */
    getLaunchScene(): number {
        return this._launchOptions?.scene || 0;
    }
}

export const Wechat = WechatAdapter.instance;
