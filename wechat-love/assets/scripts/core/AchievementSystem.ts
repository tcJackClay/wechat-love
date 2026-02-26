/**
 * 成就系统 - AchievementSystem
 * 负责成就检测、解锁、奖励发放
 */

import { EventEmitter } from './EventEmitter';

// 成就数据
export interface AchievementData {
    id: string;
    name: string;
    description: string;
    icon?: string;
    reward?: { type: string; value: number };
    secret?: boolean;  // 是否隐藏
}

// 成就状态
export interface AchievementState {
    id: string;
    unlocked: boolean;
    unlockTime?: number;
    progress?: number;
    maxProgress?: number;
}

// 成就条件
export interface AchievementCondition {
    type: 'flag' | 'favor' | 'chapter' | 'item' | 'play_time' | 'choice_count' | 'ending';
    target?: string;
    value: number;
}

// 成就定义
const ACHIEVEMENT_DEFINITIONS: Array<AchievementData & { condition: AchievementCondition }> = [
    {
        id: 'ach_first_meeting',
        name: '初次见面',
        description: '与第一位角色相遇',
        condition: { type: 'flag', target: 'met_yuqing', value: true },
    },
    {
        id: 'ach_new_friends',
        name: '新朋友',
        description: '认识所有可攻略角色',
        condition: { type: 'favor', target: 'all', value: 1 },
    },
    {
        id: 'ach_friend_zone',
        name: '友谊深厚',
        description: '与某角色好感度达到好友',
        condition: { type: 'favor', value: 400 },
    },
    {
        id: 'ach_closer',
        name: '更近一步',
        description: '与某角色好感度达到亲密',
        condition: { type: 'favor', value: 550 },
    },
    {
        id: 'ach_true_love',
        name: '命中注定',
        description: '达成真结局',
        condition: { type: 'ending', value: 1 },
    },
    {
        id: 'ach_play_5h',
        name: '沉浸其中',
        description: '累计游玩5小时',
        condition: { type: 'play_time', value: 18000 },
    },
    {
        id: 'ach_play_10h',
        name: '资深玩家',
        description: '累计游玩10小时',
        condition: { type: 'play_time', value: 36000 },
    },
    {
        id: 'ach_romantic',
        name: '浪漫约会',
        description: '完成3次约会',
        condition: { type: 'choice_count', value: 3 },
    },
    {
        id: 'ach_completist',
        name: '收集达人',
        description: '解锁所有CG',
        condition: { type: 'ending', target: 'cg', value: 10 },
    },
    {
        id: 'ach_first_gift',
        name: '心意相通',
        description: '第一次赠送礼物',
        condition: { type: 'flag', target: 'first_gift', value: true },
    },
];

export class AchievementSystem extends EventEmitter {
    private static _instance: AchievementSystem;
    public static get instance(): AchievementSystem {
        if (!AchievementSystem._instance) {
            AchievementSystem._instance = new AchievementSystem();
        }
        return AchievementSystem._instance;
    }

    // 成就状态
    private _achievements: Map<string, AchievementState> = new Map();

    // 是否正在检测
    private _isChecking: boolean = false;

    private constructor() {
        super();
        
        // 初始化成就状态
        for (const def of ACHIEVEMENT_DEFINITIONS) {
            this._achievements.set(def.id, {
                id: def.id,
                unlocked: false,
            });
        }
    }

    /**
     * 初始化
     */
    init() {
        this.startChecking();
        console.log('[AchievementSystem] 初始化完成');
    }

    /**
     * 开启成就检测
     */
    startChecking() {
        if (this._isChecking) return;
        
        this._isChecking = true;
        
        // 定时检测
        // setInterval(() => this.checkAll(), 5000);
        
        // 事件触发检测
        this.setupEventListeners();
    }

    /**
     * 停止检测
     */
    stopChecking() {
        this._isChecking = false;
    }

    /**
     * 设置事件监听
     */
    private setupEventListeners() {
        // 监听各种事件自动检测成就
        // this.on('flagChanged', () => this.checkAll());
        // this.on('favorChanged', () => this.checkAll());
        // this.on('chapterComplete', () => this.checkAll());
    }

    /**
     * 检测所有成就
     */
    checkAll() {
        if (!this._isChecking) return;

        for (const [id, state] of this._achievements) {
            if (!state.unlocked) {
                this.checkAchievement(id);
            }
        }
    }

    /**
     * 检测单个成就
     */
    checkAchievement(achievementId: string): boolean {
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
        if (!def) return false;

        const state = this._achievements.get(achievementId);
        if (!state || state.unlocked) return false;

        // 检查条件
        if (this.checkCondition(def.condition)) {
            return this.unlockAchievement(achievementId);
        }

        return false;
    }

    /**
     * 检查成就条件
     */
    private checkCondition(condition: AchievementCondition): boolean {
        switch (condition.type) {
            case 'flag':
                // return FlagManager.instance.get(condition.target!) === condition.value;
                return false;
            
            case 'favor':
                // 需要获取角色好感度
                return false;
            
            case 'chapter':
                // 需要检查章节进度
                return false;
            
            case 'item':
                // 需要检查物品
                return false;
            
            case 'play_time':
                // const playTime = SaveLoadSystem.instance.calculatePlayTime();
                // return playTime >= condition.value;
                return false;
            
            case 'choice_count':
                // 需要检查选择次数
                return false;
            
            case 'ending':
                // 需要检查结局
                return false;
            
            default:
                return false;
        }
    }

    /**
     * 解锁成就
     */
    unlockAchievement(achievementId: string): boolean {
        const state = this._achievements.get(achievementId);
        if (!state || state.unlocked) return false;

        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
        if (!def) return false;

        // 更新状态
        state.unlocked = true;
        state.unlockTime = Date.now();

        // 发放奖励
        if (def.reward) {
            this.giveReward(def.reward);
        }

        console.log(`[AchievementSystem] 解锁成就: ${def.name}`);
        this.emit('achievementUnlocked', { id: achievementId, def, state });
        
        return true;
    }

    /**
     * 发放奖励
     */
    private giveReward(reward: { type: string; value: number }) {
        switch (reward.type) {
            case 'currency':
                // InventorySystem.instance.addCurrency(reward.value);
                break;
            case 'item':
                // InventorySystem.instance.addItem(reward.value);
                break;
        }
    }

    // ==================== 查询操作 ====================

    /**
     * 获取成就状态
     */
    getState(achievementId: string): AchievementState | undefined {
        return this._achievements.get(achievementId);
    }

    /**
     * 获取成就定义
     */
    getDefinition(achievementId: string): (AchievementData & { condition: AchievementCondition }) | undefined {
        return ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    }

    /**
     * 检查是否已解锁
     */
    isUnlocked(achievementId: string): boolean {
        return this._achievements.get(achievementId)?.unlocked || false;
    }

    /**
     * 获取所有已解锁成就
     */
    getUnlockedAchievements(): AchievementState[] {
        return Array.from(this._achievements.values()).filter(s => s.unlocked);
    }

    /**
     * 获取所有未解锁成就
     */
    getLockedAchievements(): AchievementState[] {
        return Array.from(this._achievements.values()).filter(s => !s.unlocked);
    }

    /**
     * 获取成就进度
     */
    getProgress(achievementId: string): number {
        const state = this._achievements.get(achievementId);
        if (!state) return 0;

        // 已解锁
        if (state.unlocked) return 100;

        // 计算进度（简化版本）
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
        if (!def) return 0;

        // 简化进度计算
        return 0;
    }

    /**
     * 获取成就列表（用于UI显示）
     */
    getAchievementList(includeSecret: boolean = false): Array<AchievementData & AchievementState> {
        const list: Array<AchievementData & AchievementState> = [];

        for (const def of ACHIEVEMENT_DEFINITIONS) {
            // 隐藏成就需要特殊处理
            if (def.secret && !includeSecret) {
                const state = this._achievements.get(def.id);
                if (!state?.unlocked) continue;
            }

            const state = this._.id);
            listachievements.get(def.push({ ...def, ...state! });
        }

        return list;
    }

    /**
     * 获取解锁数量
     */
    getUnlockedCount(): number {
        return this.getUnlockedAchievements().length;
    }

    /**
     * 获取总数
     */
    getTotalCount(): number {
        return ACHIEVEMENT_DEFINITIONS.length;
    }

    // ==================== 存档相关 ====================

    /**
     * 导出数据
     */
    exportData(): AchievementState[] {
        return Array.from(this._achievements.values());
    }

    /**
     * 导入数据
     */
    importData(data: AchievementState[]): void {
        for (const state of data) {
            if (this._achievements.has(state.id)) {
                this._achievements.set(state.id, state);
            }
        }
    }

    /**
     * 重置
     */
    reset(): void {
        for (const [id] of this._achievements) {
            this._achievements.set(id, { id, unlocked: false });
        }
        console.log('[AchievementSystem] 已重置');
    }
}

export const Achievements = AchievementSystem.instance;
