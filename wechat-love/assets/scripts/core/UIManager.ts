/**
 * UI管理器 - UIManager
 * 负责UI界面的显示、隐藏、层级管理
 */

import { _decorator, Node, Canvas, screen, view } from 'cc';
import { EventEmitter } from './EventEmitter';

export enum UILayer {
    BACKGROUND = 0,    // 背景层
    GAME = 100,        // 游戏层
    DIALOG = 200,      // 对话层
    HUD = 300,         // HUD层
    MENU = 400,        // 菜单层
    POPUP = 500,       // 弹窗层
    TOP = 600,         // 顶层
    LOADING = 700,     // 加载层
}

export interface UIConfig {
    name: string;
    prefab: string;
    layer: UILayer;
    modal?: boolean;
    closeOnMaskClick?: boolean;
    animation?: boolean;
}

export interface OpenUIOptions {
    data?: any;
    immediate?: boolean;
}

export class UIManager extends EventEmitter {
    private static _instance: UIManager;
    public static get instance(): UIManager {
        if (!UIManager._instance) {
            UIManager._instance = new UIManager();
        }
        return UIManager._instance;
    }

    // UI配置
    private _configs: Map<string, UIConfig> = new Map();
    
    // 打开的UI实例
    private _openedUIs: Map<string, Node> = new Map();
    
    // UI层级根节点
    private _layers: Map<UILayer, Node> = new Map();
    
    // 模态框遮罩
    private _modalMask: Node = null!;

    // 画布
    private _canvas: Node = null!;

    private constructor() {
        super();
    }

    /**
     * 初始化
     */
    init(canvas: Node) {
        this._canvas = canvas;
        this.createLayers();
        this.registerDefaultUIs();
        
        console.log('[UIManager] 初始化完成');
    }

    /**
     * 创建UI层级
     */
    private createLayers() {
        if (!this._canvas) return;

        const layerOrder = [
            UILayer.BACKGROUND,
            UILayer.GAME,
            UILayer.DIALOG,
            UILayer.HUD,
            UILayer.MENU,
            UILayer.POPUP,
            UILayer.TOP,
            UILayer.LOADING,
        ];

        for (const layer of layerOrder) {
            const layerNode = new Node(`Layer_${layer}`);
            layerNode.setParent(this._canvas);
            layerNode.setSiblingIndex(layer);
            this._layers.set(layer, layerNode);
        }

        // 创建模态遮罩
        this.createModalMask();
    }

    /**
     * 创建模态遮罩
     */
    private createModalMask() {
        this._modalMask = new Node('ModalMask');
        this._modalMask.setParent(this._layers.get(UILayer.POPUP)!);
        this._modalMask.setSiblingIndex(0);
        
        // TODO: 添加遮罩组件和事件
        this._modalMask.active = false;
    }

    /**
     * 注册默认UI
     */
    private registerDefaultUIs() {
        const defaultUIs: UIConfig[] = [
            { name: 'MainMenu', prefab: 'prefabs/ui/MainMenu', layer: UILayer.MENU },
            { name: 'DialogBox', prefab: 'prefabs/ui/DialogBox', layer: UILayer.DIALOG },
            { name: 'ChoicePanel', prefab: 'prefabs/ui/ChoicePanel', layer: UILayer.DIALOG },
            { name: 'Settings', prefab: 'prefabs/ui/Settings', layer: UILayer.MENU, modal: true },
            { name: 'SaveLoad', prefab: 'prefabs/ui/SaveLoad', layer: UILayer.MENU, modal: true },
            { name: 'Gallery', prefab: 'prefabs/ui/Gallery', layer: UILayer.MENU },
            { name: 'Inventory', prefab: 'prefabs/ui/Inventory', layer: UILayer.MENU },
            { name: 'CharacterPanel', prefab: 'prefabs/ui/CharacterPanel', layer: UILayer.MENU },
            { name: 'PauseMenu', prefab: 'prefabs/ui/PauseMenu', layer: UILayer.POPUP, modal: true },
            { name: 'Toast', prefab: 'prefabs/ui/Toast', layer: UILayer.TOP, animation: true },
            { name: 'Loading', prefab: 'prefabs/ui/Loading', layer: UILayer.LOADING },
        ];

        for (const config of defaultUIs) {
            this.registerUI(config);
        }
    }

    /**
     * 注册UI
     */
    registerUI(config: UIConfig) {
        this._configs.set(config.name, config);
    }

    /**
     * 打开UI
     */
    async open<T extends Node>(name: string, options?: OpenUIOptions): Promise<T | null> {
        // 检查是否已打开
        if (this._openedUIs.has(name)) {
            console.warn(`[UIManager] UI已打开: ${name}`);
            return this._openedUIs.get(name) as T;
        }

        const config = this._configs.get(name);
        if (!config) {
            console.error(`[UIManager] 未注册的UI: ${name}`);
            return null;
        }

        // 获取层级节点
        const layerNode = this._layers.get(config.layer);
        if (!layerNode) {
            console.error(`[UIManager] 无效的层级: ${config.layer}`);
            return null;
        }

        try {
            // 加载预制体
            // const prefab = await Resources.load(config.prefab, Prefab);
            // const node = instantiate(prefab) as Node;
            
            // 模拟创建
            const node = new Node(name);
            node.setParent(layerNode);

            // 设置数据
            if (options?.data) {
                node['uiData'] = options.data;
            }

            // 记录打开的UI
            this._openedUIs.set(name, node);

            // 显示模态遮罩
            if (config.modal) {
                this.showModalMask(true);
            }

            // 播放动画
            if (config.animation !== false) {
                this.playOpenAnimation(node);
            }

            this.emit('UIOpened', { name, node, config });
            
            console.log(`[UIManager] 打开UI: ${name}`);
            return node as T;
        } catch (error) {
            console.error(`[UIManager] 打开UI失败: ${name}`, error);
            return null;
        }
    }

    /**
     * 关闭UI
     */
    close(name: string, force: boolean = false): boolean {
        const node = this._openedUIs.get(name);
        if (!node) {
            console.warn(`[UIManager] UI未打开: ${name}`);
            return false;
        }

        const config = this._configs.get(name);

        // 隐藏模态遮罩
        if (config?.modal) {
            this.showModalMask(false);
        }

        // 播放关闭动画
        if (config?.animation !== false) {
            this.playCloseAnimation(node, () => {
                this.destroyUI(name, node);
            });
        } else {
            this.destroyUI(name, node);
        }

        this.emit('UIClosed', { name });
        return true;
    }

    /**
     * 销毁UI
     */
    private destroyUI(name: string, node: Node) {
        node.destroy();
        this._openedUIs.delete(name);
        console.log(`[UIManager] 关闭UI: ${name}`);
    }

    /**
     * 关闭所有UI
     */
    closeAll(exclude: string[] = []) {
        for (const name of this._openedUIs.keys()) {
            if (!exclude.includes(name)) {
                this.close(name);
            }
        }
    }

    /**
     * 获取打开的UI
     */
    get<T extends Node>(name: string): T | null {
        return this._openedUIs.get(name) as T ?? null;
    }

    /**
     * 检查UI是否打开
     */
    isOpened(name: string): boolean {
        return this._openedUIs.has(name);
    }

    /**
     * 获取所有打开的UI
     */
    getAllOpened(): string[] {
        return Array.from(this._openedUIs.keys());
    }

    /**
     * 显示/隐藏模态遮罩
     */
    private showModalMask(show: boolean) {
        this._modalMask.active = show;
    }

    /**
     * 播放打开动画
     */
    private playOpenAnimation(node: Node) {
        // TODO: 使用tween动画
        node.setScale(0.8, 0.8, 1);
        
        // tween(node)
        //     .to(0.2, { scale: new Vec3(1, 1, 1) })
        //     .easing('backOut')
        //     .start();
    }

    /**
     * 播放关闭动画
     */
    private playCloseAnimation(node: Node, onComplete: () => void) {
        // tween(node)
        //     .to(0.15, { scale: new Vec3(0.9, 0.9, 1) })
        //     .to(0.1, { scale: new Vec3(0, 0, 0) })
        //     .call(onComplete)
        //     .start();
        
        onComplete();
    }

    /**
     * 显示Toast提示
     */
    showToast(message: string, duration: number = 2000) {
        this.open('Toast', { data: { message, duration } });
    }

    /**
     * 显示加载界面
     */
    showLoading(tip: string = '加载中...') {
        this.open('Loading', { data: { tip } });
    }

    /**
     * 隐藏加载界面
     */
    hideLoading() {
        this.close('Loading');
    }

    /**
     * 暂停所有UI交互
     */
    pauseAll() {
        for (const node of this._openedUIs.values()) {
            // node.pauseInputEvents();
        }
    }

    /**
     * 恢复所有UI交互
     */
    resumeAll() {
        for (const node of this._openedUIs.values()) {
            // node.resumeInputEvents();
        }
    }
}

export const UI = UIManager.instance;
