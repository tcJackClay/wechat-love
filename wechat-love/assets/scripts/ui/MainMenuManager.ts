/**
 * 主菜单管理器 - MainMenu场景控制器
 */

import { _decorator, Component, Node, Button, Label, Sprite, tween, Vec3, UITransform } from 'cc';
import { GameStateMachine, MenuState, GameState } from './GameStateMachine';

const { ccclass, property } = _decorator;

@ccclass('MainMenuManager')
export class MainMenuManager extends Component {
    // 菜单按钮
    @property({ type: Button })
    btnNewGame: Button = null!;

    @property({ type: Button })
    btnContinue: Button = null!;

    @property({ type: Button })
    btnLoad: Button = null!;

    @property({ type: Button })
    btnSettings: Button = null!;

    @property({ type: Button })
    btnGallery: Button = null!;

    // 确认对话框
    @property({ type: Node })
    confirmPanel: Node = null!;

    @property({ type: Label })
    confirmText: Label = null!;

    @property({ type: Button })
    btnConfirmYes: Button = null!;

    @property({ type: Button })
    btnConfirmNo: Button = null!;

    // 菜单状态
    private _currentMenuState: MenuState = MenuState.MAIN;
    private _stateMachine: GameStateMachine = null!;

    // 动画相关
    private _isAnimating: boolean = false;

    onLoad() {
        this._stateMachine = GameStateMachine.instance;
        this.initButtons();
        this.showMainMenu();
    }

    start() {
        // 播放背景音乐
        // AudioManager.playBGM('title');
        
        // 播放开场动画
        this.playEntranceAnimation();
    }

    /**
     * 初始化按钮事件
     */
    private initButtons() {
        this.btnNewGame.node.on('click', this.onNewGame, this);
        this.btnContinue.node.on('click', this.onContinue, this);
        this.btnLoad.node.on('click', this.onLoadGame, this);
        this.btnSettings.node.on('click', this.onSettings, this);
        this.btnGallery.node.on('click', this.onGallery, this);

        this.btnConfirmYes.node.on('click', this.onConfirmYes, this);
        this.btnConfirmNo.node.on('click', this.onConfirmNo, this);
    }

    /**
     * 显示主菜单
     */
    private showMainMenu() {
        this._currentMenuState = MenuState.MAIN;
        this._stateMachine.setMenuState(MenuState.MAIN);
        this.confirmPanel.active = false;
    }

    /**
     * 播放入场动画
     */
    private async playEntranceAnimation() {
        this._isAnimating = true;
        const buttons = [
            this.btnNewGame.node,
            this.btnContinue.node,
            this.btnLoad.node,
            this.btnSettings.node,
            this.btnGallery.node,
        ];

        // 从下方滑入
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const startY = 800;
            const targetY = btn.position.y;
            
            btn.setPosition(btn.position.x, startY);
            
            tween(btn)
                .to(0.3 + i * 0.1, { position: new Vec3(btn.position.x, targetY, 0) })
                .easing('backOut')
                .start();
        }

        // 延迟解锁交互
        setTimeout(() => {
            this._isAnimating = false;
        }, 1000);
    }

    // ==================== 按钮回调 ====================

    /**
     * 新游戏
     */
    private onNewGame() {
        if (this._isAnimating) return;

        // 检查是否有存档
        if (this.hasSaveData()) {
            this.showConfirm(
                '已有存档，开始新游戏将覆盖当前进度，是否继续？',
                () => this.startNewGame()
            );
        } else {
            this.startNewGame();
        }
    }

    /**
     * 开始新游戏
     */
    private startNewGame() {
        console.log('[MainMenu] 开始新游戏');
        
        // 重置游戏数据
        // SaveManager.newGame();
        
        // 切换到游戏场景
        this._stateMachine.changeState(GameState.PLAYING);
        
        // 加载第一章
        // SceneManager.loadScene('Chapter1');
        
        this.showMenuButtons(false);
    }

    /**
     * 继续游戏
     */
    private onContinue() {
        if (this._isAnimating) return;
        
        if (!this.hasSaveData()) {
            console.log('[MainMenu] 没有存档');
            return;
        }

        console.log('[MainMenu] 继续游戏');
        this._stateMachine.changeState(GameState.PLAYING);
        this.showMenuButtons(false);
    }

    /**
     * 读取存档
     */
    private onLoadGame() {
        if (this._isAnimating) return;

        console.log('[MainMenu] 读取存档');
        this._stateMachine.changeState(GameState.SAVE_LOAD);
    }

    /**
     * 设置
     */
    private onSettings() {
        if (this._isAnimating) return;

        console.log('[MainMenu] 设置');
        this._stateMachine.changeState(GameState.SETTINGS);
    }

    /**
     * 画廊
     */
    private onGallery() {
        if (this._isAnimating) return;

        console.log('[MainMenu] 画廊');
        this._stateMachine.changeState(GameState.GALLERY);
    }

    // ==================== 确认对话框 ====================

    /**
     * 显示确认对话框
     */
    private showConfirm(text: string, onYes: () => void) {
        this.confirmText.string = text;
        this.confirmPanel.active = true;

        // 绑定确认回调
        this.btnConfirmYes.node.off('click');
        this.btnConfirmYes.node.on('click', () => {
            onYes();
            this.confirmPanel.active = false;
        });

        this.btnConfirmNo.node.off('click');
        this.btnConfirmNo.node.on('click', () => {
            this.confirmPanel.active = false;
        });

        // 动画
        tween(this.confirmPanel)
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .from({ scale: new Vec3(0.8, 0.8, 0.8) })
            .start();
    }

    private onConfirmYes() {
        // 由showConfirm动态绑定
    }

    private onConfirmNo() {
        // 由showConfirm动态绑定
    }

    // ==================== 工具方法 ====================

    /**
     * 显示/隐藏菜单按钮
     */
    private showMenuButtons(show: boolean) {
        const buttons = [
            this.btnNewGame.node,
            this.btnContinue.node,
            this.btnLoad.node,
            this.btnSettings.node,
            this.btnGallery.node,
        ];

        buttons.forEach(btn => {
            tween(btn)
                .to(0.2, { 
                    active: show,
                    scale: show ? new Vec3(1, 1, 1) : new Vec3(0, 0, 0)
                })
                .start();
        });
    }

    /**
     * 检查是否有存档
     */
    private hasSaveData(): boolean {
        // TODO: 检查本地存储
        return false;
    }

    /**
     * 退出游戏
     */
    private exitGame() {
        // 微信小游戏退出
        // wx.exitMiniProgram();
        
        console.log('[MainMenu] 退出游戏');
    }
}
