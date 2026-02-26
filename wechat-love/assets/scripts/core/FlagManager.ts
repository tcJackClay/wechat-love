/**
 * 标志位系统 - FlagManager
 * 负责游戏全局标志位的管理，用于剧情分支、事件触发等
 */

import { EventEmitter } from './EventEmitter';

export interface FlagData {
    key: string;
    value: boolean;
    description?: string;
}

// 标志位定义
export interface FlagDefinition {
    key: string;
    defaultValue: boolean;
    description: string;
    // 标签，用于分类
    tags?: string[];
}

// 预定义标志位
const FLAG_DEFINITIONS: FlagDefinition[] = [
    // 剧情相关
    { key: 'met_yuqing', defaultValue: false, description: '是否见过林雨晴', tags: ['story', 'heroine_1'] },
    { key: 'met_xiaowan', defaultValue: false, description: '是否见过苏小晚', tags: ['story', 'heroine_2'] },
    { key: 'met_mohan', defaultValue: false, description: '是否见过沈墨寒', tags: ['story', 'heroine_3'] },
    
    // 选项相关
    { key: 'polite', defaultValue: false, description: '是否礼貌回应', tags: ['choice'] },
    { key: 'cold', defaultValue: false, description: '是否冷淡回应', tags: ['choice'] },
    { key: 'ask_about_mo', defaultValue: false, description: '是否询问沈墨寒的事', tags: ['choice'] },
    
    // 事件相关
    { key: 'event_date_1', defaultValue: false, description: '是否完成第一次约会', tags: ['event'] },
    { key: 'event_basketball', defaultValue: false, description: '是否观看篮球比赛', tags: ['event'] },
    { key: 'event_library', defaultValue: false, description: '是否一起去图书馆', tags: ['event'] },
    { key: 'event_festival', defaultValue: false, description: '是否参加学园祭', tags: ['event'] },
    
    // 解锁相关
    { key: 'unlock_heroine_2', defaultValue: false, description: '是否解锁苏小晚', tags: ['unlock'] },
    { key: 'unlock_heroine_3', defaultValue: false, description: '是否解锁沈墨寒', tags: ['unlock'] },
    { key: 'unlock_cg_1', defaultValue: false, description: '是否解锁CG 1', tags: ['unlock', 'cg'] },
    { key: 'unlock_ending_1', defaultValue: false, description: '是否解锁结局1', tags: ['unlock', 'ending'] },
    
    // 特殊
    { key: 'is_auto_save', defaultValue: false, description: '是否为自动存档', tags: ['system'] },
    { key: 'skip_mode', defaultValue: false, description: '是否跳过模式', tags: ['system'] },
];

export class FlagManager extends EventEmitter {
    private static _instance: FlagManager;
    public static get instance(): FlagManager {
        if (!FlagManager._instance) {
            FlagManager._instance = new FlagManager();
        }
        return FlagManager._instance;
    }

    // 标志位存储
    private _flags: Map<string, boolean> = new Map();
    
    // 定义缓存
    private _definitions: Map<string, FlagDefinition> = new Map();

    private constructor() {
        super();
        
        // 初始化定义
        for (const def of FLAG_DEFINITIONS) {
            this._definitions.set(def.key, def);
            this._flags.set(def.key, def.defaultValue);
        }
    }

    /**
     * 初始化
     */
    init() {
        console.log('[FlagManager] 初始化完成');
    }

    // ==================== 基础操作 ====================

    /**
     * 设置标志位
     */
    set(key: string, value: boolean): void {
        const oldValue = this._flags.get(key) ?? false;
        
        if (oldValue === value) return;

        this._flags.set(key, value);
        
        console.log(`[FlagManager] ${key}: ${oldValue} -> ${value}`);
        
        // 发送事件
        this.emit('flagChanged', { key, oldValue, newValue: value });
    }

    /**
     * 获取标志位
     */
    get(key: string): boolean {
        return this._flags.get(key) ?? false;
    }

    /**
     * 切换标志位
     */
    toggle(key: string): boolean {
        const current = this.get(key);
        this.set(key, !current);
        return !current;
    }

    /**
     * 检查标志位
     */
    check(key: string): boolean {
        return this.get(key);
    }

    /**
     * 批量设置
     */
    setMultiple(flags: Record<string, boolean>): void {
        for (const [key, value] of Object.entries(flags)) {
            this.set(key, value);
        }
    }

    /**
     * 批量检查（与运算）
     */
    checkAll(flags: string[]): boolean {
        return flags.every(key => this.get(key));
    }

    /**
     * 批量检查（或运算）
     */
    checkAny(flags: string[]): boolean {
        return flags.some(key => this.get(key));
    }

    // ==================== 条件检查 ====================

    /**
     * 检查是否满足条件
     */
    checkCondition(condition: { type: string; target: string; value: any }): boolean {
        switch (condition.type) {
            case 'flag':
                return this.get(condition.target) === condition.value;
            
            case 'favor':
                // 需要结合CharacterSystem
                // return CharacterSystem.instance.getFavor(condition.target) >= condition.value;
                return false;
            
            case 'chapter':
                // 需要结合StoryManager
                // return StoryManager.instance.getProgress().chapter === condition.value;
                return false;
            
            case 'item':
                // 需要结合InventorySystem
                // return InventorySystem.instance.hasItem(condition.target);
                return false;
            
            default:
                console.warn(`[FlagManager] 未知条件类型: ${condition.type}`);
                return false;
        }
    }

    /**
     * 检查多个条件（与运算）
     */
    checkConditions(conditions: { type: string; target: string; value: any }[]): boolean {
        return conditions.every(c => this.checkCondition(c));
    }

    // ==================== 查询功能 ====================

    /**
     * 获取所有标志位
     */
    getAllFlags(): Map<string, boolean> {
        return new Map(this._flags);
    }

    /**
     * 获取已设置为true的标志位
     */
    getTrueFlags(): string[] {
        const result: string[] = [];
        for (const [key, value] of this._flags) {
            if (value) result.push(key);
        }
        return result;
    }

    /**
     * 按标签获取标志位
     */
    getFlagsByTag(tag: string): string[] {
        const result: string[] = [];
        
        for (const [key, def] of this._definitions) {
            if (def.tags?.includes(tag)) {
                result.push(key);
            }
        }
        
        return result;
    }

    /**
     * 获取标志位定义
     */
    getDefinition(key: string): FlagDefinition | undefined {
        return this._definitions.get(key);
    }

    /**
     * 获取所有定义
     */
    getAllDefinitions(): FlagDefinition[] {
        return Array.from(this._definitions.values());
    }

    // ==================== 存档相关 ====================

    /**
     * 导出标志位数据
     */
    exportData(): Record<string, boolean> {
        const data: Record<string, boolean> = {};
        
        // 只导出非默认值的标志位
        for (const [key, value] of this._flags) {
            const def = this._definitions.get(key);
            if (def && value !== def.defaultValue) {
                data[key] = value;
            }
        }
        
        return data;
    }

    /**
     * 导入标志位数据
     */
    importData(data: Record<string, boolean>): void {
        // 先重置为默认值
        this.reset();
        
        // 导入数据
        for (const [key, value] of Object.entries(data)) {
            this.set(key, value);
        }
    }

    /**
     * 完整导出（包括默认值）
     */
    exportFullData(): Record<string, boolean> {
        return Object.fromEntries(this._flags);
    }

    // ==================== 重置 ====================

    /**
     * 重置所有标志位
     */
    reset(): void {
        for (const [key, def] of this._definitions) {
            this._flags.set(key, def.defaultValue);
        }
        
        console.log('[FlagManager] 已重置所有标志位');
        this.emit('reset');
    }

    /**
     * 重置指定标签的标志位
     */
    resetByTag(tag: string): void {
        const keys = this.getFlagsByTag(tag);
        for (const key of keys) {
            const def = this._definitions.get(key);
            if (def) {
                this.set(key, def.defaultValue);
            }
        }
        
        console.log(`[FlagManager] 已重置标签 ${tag} 的标志位`);
    }

    /**
     * 添加自定义标志位
     */
    addFlag(key: string, defaultValue: boolean = false, description: string = '', tags: string[] = []): void {
        if (this._definitions.has(key)) {
            console.warn(`[FlagManager] 标志位已存在: ${key}`);
            return;
        }

        const def: FlagDefinition = { key, defaultValue, description, tags };
        this._definitions.set(key, def);
        this._flags.set(key, defaultValue);
        
        console.log(`[FlagManager] 添加标志位: ${key}`);
    }

    // ==================== 调试 ====================

    /**
     * 打印所有标志位状态
     */
    printAll(): void {
        console.log('========== Flag Status ==========');
        for (const [key, def] of this._definitions) {
            const value = this._flags.get(key);
            console.log(`[${value ? '✓' : ' '}] ${key}: ${value} (${def.description})`);
        }
        console.log('==================================');
    }
}

// 导出便捷方法
export const Flags = FlagManager.instance;
