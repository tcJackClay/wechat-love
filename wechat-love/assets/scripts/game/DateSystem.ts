/**
 * 约会系统 - DateSystem
 * 负责约会场景的触发、进行、结算
 */

import { EventEmitter } from './EventEmitter';
import { CharacterSystem, CharacterPose, CharacterPosition } from './CharacterSystem';
import { InventorySystem } from './InventorySystem';
import { DialogSystem } from './DialogSystem';
import { GameStateMachine, GameState } from './GameStateMachine';

// 约会地点配置
export interface DateLocation {
    id: string;
    name: string;
    description: string;
    cost: number;           // 花费金币
    energyCost: number;     // 体力消耗
    requiredFavor: number; // 最低好感要求
    availableTime: string[]; // 可用时间段 ['morning', 'afternoon', 'evening']
    events: string[];      // 约会事件ID列表
    bgm?: string;          // 背景音乐
    background?: string;    // 背景图
}

// 约会事件
export interface DateEvent {
    id: string;
    locationId: string;
    title: string;
    description: string;
    choices: DateChoice[];
    minFavor: number;      // 最低好感要求
    reward?: {
        favor: number;
        item?: string;
    };
}

// 约会选项
export interface DateChoice {
    id: string;
    text: string;
    favorChange: number;   // 好感变化
    energyChange?: number;  // 体力变化
    nextEvent?: string;     // 下一个事件
    isGood: boolean;       // 是否是好选择
}

// 约会状态
export enum DateState {
    IDLE = 'idle',           // 空闲
    SELECTING = 'selecting', // 选择地点
    IN_PROGRESS = 'in_progress', // 进行中
    EVENT = 'event',         // 事件中
    COMPLETE = 'complete',   // 完成
}

// 约会配置
const DATE_LOCATIONS: DateLocation[] = [
    {
        id: 'location_school_cafe',
        name: '校内咖啡厅',
        description: '环境优雅的咖啡厅，适合聊天',
        cost: 100,
        energyCost: 20,
        requiredFavor: 0,
        availableTime: ['afternoon', 'evening'],
        events: ['event_cafe_1', 'event_cafe_2'],
        bgm: 'bgm_date',
        background: 'bg_cafe',
    },
    {
        id: 'location_courtyard',
        name: '校园庭院',
        description: '景色优美的庭院，适合散步',
        cost: 0,
        energyCost: 15,
        requiredFavor: 0,
        availableTime: ['morning', 'afternoon', 'evening'],
        events: ['event_courtyard_1', 'event_courtyard_2'],
        background: 'bg_courtyard',
    },
    {
        id: 'location_library',
        name: '图书馆',
        description: '安静的学习场所',
        cost: 0,
        energyCost: 25,
        requiredFavor: 100,
        availableTime: ['afternoon'],
        events: ['event_library_1', 'event_library_2'],
        background: 'bg_classroom',
    },
    {
        id: 'location cinema',
        name: '电影院',
        description: '一起看场电影',
        cost: 300,
        energyCost: 35,
        requiredFavor: 300,
        availableTime: ['evening'],
        events: ['event_cinema_1', 'event_cinema_2'],
        bgm: 'bgm_date',
        background: 'bg_date',
    },
    {
        id: 'location_amusement_park',
        name: '游乐园',
        description: '充满欢乐的主题乐园',
        cost: 500,
        energyCost: 50,
        requiredFavor: 500,
        availableTime: ['all_day'],
        events: ['event_park_1', 'event_park_2', 'event_park_3'],
        bgm: 'bgm_date',
        background: 'bg_courtyard',
    },
];

// 约会事件配置
const DATE_EVENTS: DateEvent[] = [
    // 咖啡厅事件
    {
        id: 'event_cafe_1',
        locationId: 'location_school_cafe',
        title: '轻松的下午茶',
        description: '你们来到咖啡厅，点了一些饮品...',
        choices: [
            {
                id: 'choice_1a',
                text: '聊起最近的趣事',
                favorChange: 15,
                nextEvent: 'event_cafe_2',
                isGood: true,
            },
            {
                id: 'choice_1b',
                text: '谈论未来的梦想',
                favorChange: 20,
                nextEvent: 'event_cafe_2',
                isGood: true,
            },
            {
                id: 'choice_1c',
                text: '专注于喝咖啡',
                favorChange: 5,
                isGood: false,
            },
        ],
        minFavor: 0,
        reward: { favor: 10 },
    },
    // 庭院事件
    {
        id: 'event_courtyard_1',
        locationId: 'location_courtyard',
        title: '夕阳下的散步',
        description: '夕阳西下，你们在庭院中漫步...',
        choices: [
            {
                id: 'choice_2a',
                text: '一起欣赏夕阳',
                favorChange: 25,
                isGood: true,
            },
            {
                id: 'choice_2b',
                text: '讲述自己的故事',
                favorChange: 20,
                isGood: true,
            },
            {
                id: 'choice_2c',
                text: '聊聊学业压力',
                favorChange: 10,
                isGood: false,
            },
        ],
        minFavor        reward: {: 0,
 favor: 15 },
    },
    // 电影院事件
    {
        id: 'event_cinema_1',
        locationId: 'location_cinema',
        title: '黑暗中的心动',
        description: '电影开场了，你们坐在一起...',
        choices: [
            {
                id: 'choice_3a',
                text: '偷偷看她/他的反应',
                favorChange: 30,
                isGood: true,
            },
            {
                id: 'choice_3b',
                text: '轻声讨论剧情',
                favorChange: 15,
                isGood: true,
            },
            {
                id: 'choice_3c',
                text: '专注于看电影',
                favorChange: 5,
                isGood: false,
            },
        ],
        minFavor: 300,
        reward: { favor: 20 },
    },
];

export class DateSystem extends EventEmitter {
    private static _instance: DateSystem;
    public static get instance(): DateSystem {
        if (!DateSystem._instance) {
            DateSystem._instance = new DateSystem();
        }
        return DateSystem._instance;
    }

    // 约会状态
    private _state: DateState = DateState.IDLE;
    
    // 当前约会的角色
    private _currentCharacter: string = '';
    
    // 当前地点
    private _currentLocation: DateLocation = null!;
    
    // 当前事件
    private _currentEvent: DateEvent = null!;
    
    // 约会进行中的好感变化累计
    private _totalFavorChange: number = 0;

    private constructor() {
        super();
    }

    /**
     * 初始化
     */
    init() {
        console.log('[DateSystem] 初始化完成');
    }

    // ==================== 约会流程 ====================

    /**
     * 开始约会（选择角色和地点）
     */
    startDate(characterId: string): DateLocation[] {
        const character = CharacterSystem.instance.getCharacter(characterId);
        if (!character) {
            console.error(`[DateSystem] 未知角色: ${characterId}`);
            return [];
        }

        this._currentCharacter = characterId;
        this._state = DateState.SELECTING;
        this._totalFavorChange = 0;

        // 获取可用的约会地点
        const availableLocations = this.getAvailableLocations(character.favor);

        console.log(`[DateSystem] 开始约会: ${character.name}`);
        this.emit('dateStarted', { characterId, locations: availableLocations });

        return availableLocations;
    }

    /**
     * 选择约会地点
     */
    selectLocation(locationId: string): boolean {
        const location = DATE_LOCATIONS.find(l => l.id === locationId);
        if (!location) {
            console.error(`[DateSystem] 未知地点: ${locationId}`);
            return false;
        }

        // 检查金币
        if (!InventorySystem.instance.spendCurrency(location.cost)) {
            console.warn(`[DateSystem] 金币不足: 需要${location.cost}`);
            this.emit('insufficientFunds', { location, cost: location.cost });
            return false;
        }

        // 检查好感要求
        const character = CharacterSystem.instance.getCharacter(this._currentCharacter);
        if (character && character.favor < location.requiredFavor) {
            console.warn(`[DateSystem] 好感度不足: 需要${location.requiredFavor}, 当前${character.favor}`);
            this.emit('favorTooLow', { location, required: location.requiredFavor, current: character.favor });
            return false;
        }

        this._currentLocation = location;
        this._state = DateState.IN_PROGRESS;

        // 触发第一个事件
        if (location.events.length > 0) {
            this.startEvent(location.events[0]);
        }

        console.log(`[DateSystem] 地点选择: ${location.name}`);
        this.emit('locationSelected', { location });

        return true;
    }

    /**
     * 开始约会事件
     */
    private startEvent(eventId: string) {
        const event = DATE_EVENTS.find(e => e.id === eventId);
        if (!event) {
            console.warn(`[DateSystem] 未找到事件: ${eventId}`);
            this.completeDate();
            return;
        }

        this._currentEvent = event;
        this._state = DateState.EVENT;

        console.log(`[DateSystem] 开始事件: ${event.title}`);
        this.emit('eventStarted', { event });
    }

    /**
     * 选择约会选项
     */
    selectChoice(choiceId: string): void {
        if (!this._currentEvent) return;

        const choice = this._currentEvent.choices.find(c => c.id === choiceId);
        if (!choice) {
            console.error(`[DateSystem] 未知选项: ${choiceId}`);
            return;
        }

        // 应用好感变化
        if (choice.favorChange !== 0) {
            const actualChange = CharacterSystem.instance.changeFavor(
                this._currentCharacter, 
                choice.favorChange
            );
            this._totalFavorChange += actualChange;
        }

        // 播放选择音效
        // AudioManager.playSFX('choice_select');

        console.log(`[DateSystem] 选择: ${choice.text}, 好感+${choice.favorChange}`);
        this.emit('choiceSelected', { choice, favorChange: choice.favorChange });

        // 继续下一个事件或结束
        if (choice.nextEvent) {
            this.startEvent(choice.nextEvent);
        } else {
            this.completeDate();
        }
    }

    /**
     * 完成约会
     */
    private completeDate() {
        this._state = DateState.COMPLETE;

        const character = CharacterSystem.instance.getCharacter(this._currentCharacter);
        const location = this._currentLocation;

        console.log(`[DateSystem] 约会完成: ${character?.name}, 好感总计+${this._totalFavorChange}`);
        
        this.emit('dateCompleted', {
            characterId: this._currentCharacter,
            locationName: location?.name,
            totalFavorChange: this._totalFavorChange,
        });

        // 重置状态
        this._state = DateState.IDLE;
        this._currentCharacter = '';
        this._currentLocation = null!;
        this._currentEvent = null!;
    }

    /**
     * 取消约会
     */
    cancelDate() {
        this._state = DateState.IDLE;
        this._currentCharacter = '';
        this._currentLocation = null!;
        this._currentEvent = null!;
        
        console.log('[DateSystem] 约会取消');
        this.emit('dateCancelled');
    }

    // ==================== 查询功能 ====================

    /**
     * 获取可用的约会地点
     */
    getAvailableLocations(currentFavor: number): DateLocation[] {
        return DATE_LOCATIONS.filter(location => 
            currentFavor >= location.requiredFavor
        );
    }

    /**
     * 获取所有约会地点
     */
    getAllLocations(): DateLocation[] {
        return DATE_LOCATIONS;
    }

    /**
     * 获取当前状态
     */
    getState(): DateState {
        return this._state;
    }

    /**
     * 是否正在进行约会
     */
    isInDate(): boolean {
        return this._state === DateState.IN_PROGRESS || 
               this._state === DateState.EVENT;
    }

    /**
     * 获取当前约会角色
     */
    getCurrentCharacter(): string {
        return this._currentCharacter;
    }

    // ==================== 约会事件管理 ====================

    /**
     * 添加自定义约会地点
     */
    addLocation(location: DateLocation): void {
        DATE_LOCATIONS.push(location);
        console.log(`[DateSystem] 添加地点: ${location.name}`);
    }

    /**
     * 添加自定义约会事件
     */
    addEvent(event: DateEvent): void {
        DATE_EVENTS.push(event);
        console.log(`[DateSystem] 添加事件: ${event.title}`);
    }

    /**
     * 获取地点详情
     */
    getLocation(locationId: string): DateLocation | undefined {
        return DATE_LOCATIONS.find(l => l.id === locationId);
    }

    /**
     * 获取事件详情
     */
    getEvent(eventId: string): DateEvent | undefined {
        return DATE_EVENTS.find(e => e.id === eventId);
    }
}

// 导出
export const DateSystem = DateSystem.instance;
