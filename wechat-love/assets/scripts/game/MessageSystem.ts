/**
 * 短信聊天系统 - MessageSystem
 * 模拟微信/短信聊天界面，用于与角色互动
 */

import { EventEmitter } from './EventEmitter';
import { CharacterSystem } from './CharacterSystem';

// 消息类型
export enum MessageType {
    TEXT = 'text',           // 文字
    IMAGE = 'image',        // 图片
    VOICE = 'voice',        // 语音
    EMOJI = 'emoji',        // 表情包
    TIME_DIVIDER = 'time',   // 时间分割线
    SYSTEM = 'system',      // 系统消息
}

// 消息方向
export enum MessageDirection {
    INCOMING = 'incoming',  // 对方发来
    OUTGOING = 'outgoing',  // 我发送
}

// 单条消息
export interface ChatMessage {
    id: string;
    type: MessageType;
    direction: MessageDirection;
    senderId: string;       // 发送者ID
    content: string;        // 内容
    timestamp: number;     // 时间戳
    read: boolean;         // 已读
    reactions?: string[];   // 表情反应
}

// 对话会话
export interface ChatSession {
    characterId: string;
    messages: ChatMessage[];
    lastMessageTime: number;
    unreadCount: number;
}

// 聊天触发条件
export interface ChatTrigger {
    id: string;
    characterId: string;
    type: 'time' | 'event' | 'choice' | 'favor';
    condition: string;      // 条件表达式
    messages: ChatMessage[]; // 触发消息
    requiredFavor?: number; // 好感要求
    oneTime?: boolean;      // 是否一次性触发
    triggered?: boolean;    // 是否已触发
}

// 快速回复选项
export interface QuickReply {
    id: string;
    text: string;
    favorChange: number;   // 好感变化
    nextTrigger?: string;   // 触发的下一组消息
}

// 聊天场景
export enum ChatScene {
    NORMAL = 'normal',     // 日常聊天
    EVENT = 'event',        // 事件触发
    SPECIAL = 'special',   // 特殊对话
}

// 预设聊天内容
const CHAT_TRIGGERS: ChatTrigger[] = [
    // 序章后 - 林雨晴
    {
        id: 'trigger_yuqing_1',
        characterId: 'heroine_1',
        type: 'event',
        condition: 'ch00_end',
        requiredFavor: 0,
        oneTime: true,
        messages: [
            {
                id: 'msg_yq_1_1',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_1',
                content: '今天谢谢你带我熟悉校园~',
                timestamp: 0,
                read: false,
            },
            {
                id: 'msg_yq_1_2',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_1',
                content: '有时间再聊哦 😊',
                timestamp: 0,
                read: false,
            },
        ],
    },
    // 苏小晚 - 初次相遇后
    {
        id: 'trigger_xiaowan_1',
        characterId: 'heroine_2',
        type: 'event',
        condition: 'ch01_end',
        requiredFavor: 0,
        oneTime: true,
        messages: [
            {
                id: 'msg_xw_1_1',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_2',
                content: '嘿！今天谢谢你接住球啦~',
                timestamp: 0,
                read: false,
            },
            {
                id: 'msg_xw_1_2',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_2',
                content: '下次一起打球吧！🏀',
                timestamp: 0,
                read: false,
            },
        ],
    },
    // 沈墨寒 - 初次相遇后
    {
        id: 'trigger_mohan_1',
        characterId: 'heroine_3',
        type: 'event',
        condition: 'ch02_end',
        requiredFavor: 0,
        oneTime: true,
        messages: [
            {
                id: 'msg_mh_1_1',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_3',
                content: '......',
                timestamp: 0,
                read: false,
            },
            {
                id: 'msg_mh_1_2',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_3',
                content: '今天的画...你觉得怎么样？',
                timestamp: 0,
                read: false,
            },
        ],
    },
    // 日常问候 - 好感>=100
    {
        id: 'trigger_daily_greeting',
        characterId: 'heroine_1',
        type: 'time',
        condition: 'morning',
        requiredFavor: 100,
        oneTime: false,
        messages: [
            {
                id: 'msg_daily_1',
                type: MessageType.TEXT,
                direction: MessageDirection.INCOMING,
                senderId: 'heroine_1',
                content: '早上好！☀️ 今天也要加油哦~',
                timestamp: 0,
                read: false,
            },
        ],
    },
];

// 快速回复选项
const QUICK_REPLIES: Record<string, QuickReply[]> = {
    'heroine_1': [
        { id: 'qr_1', text: '学姐早上好！', favorChange: 3 },
        { id: 'qr_2', text: '谢谢学姐关心~', favorChange: 5 },
        { id: 'qr_3', text: '今天有什么安排吗？', favorChange: 2 },
    ],
    'heroine_2': [
        { id: 'qr_1', text: '小晚早！', favorChange: 3 },
        { id: 'qr_2', text: '一起打球吗？', favorChange: 5 },
        { id: 'qr_3', text: '昨天谢谢你~', favorChange: 2 },
    ],
    'heroine_3': [
        { id: 'qr_1', text: '早', favorChange: 1 },
        { id: 'qr_2', text: '你的画很棒', favorChange: 8 },
        { id: 'qr_3', text: '一起去吃饭？', favorChange: 3 },
    ],
};

export class MessageSystem extends EventEmitter {
    private static _instance: MessageSystem;
    public static get instance(): MessageSystem {
        if (!MessageSystem._instance) {
            MessageSystem._instance = new MessageSystem();
        }
        return MessageSystem._instance;
    }

    // 所有会话
    private _sessions: Map<string, ChatSession> = new Map();
    
    // 聊天触发器
    private _triggers: ChatTrigger[] = [...CHAT_TRIGGERS];
    
    // 当前场景
    private _currentScene: ChatScene = ChatScene.NORMAL;
    
    // 待发送消息队列
    private _messageQueue: ChatMessage[] = [];
    
    // 是否正在显示消息
    private _isShowingMessage: boolean = false;

    private constructor() {
        super();
    }

    /**
     * 初始化
     */
    init() {
        // 初始化所有角色的会话
        const characters = ['heroine_1', 'heroine_2', 'heroine_3'];
        for (const charId of characters) {
            this._sessions.set(charId, {
                characterId: charId,
                messages: [],
                lastMessageTime: Date.now(),
                unreadCount: 0,
            });
        }
        
        console.log('[MessageSystem] 初始化完成');
    }

    // ==================== 消息操作 ====================

    /**
     * 发送消息
     */
    sendMessage(characterId: string, content: string, quickReplyId?: string): void {
        const session = this._sessions.get(characterId);
        if (!session) {
            console.error(`[MessageSystem] 未找到会话: ${characterId}`);
            return;
        }

        // 创建消息
        const message: ChatMessage = {
            id: `msg_${Date.now()}`,
            type: MessageType.TEXT,
            direction: MessageDirection.OUTGOING,
            senderId: 'player',
            content,
            timestamp: Date.now(),
            read: true,
        };

        session.messages.push(message);
        session.lastMessageTime = Date.now();

        console.log(`[MessageSystem] 发送消息: ${content}`);
        
        // 处理快速回复
        if (quickReplyId) {
            this.handleQuickReply(characterId, quickReplyId);
        }

        // 触发回复
        this.scheduleReply(characterId);

        this.emit('messageSent', { characterId, message });
    }

    /**
     * 接收消息（对方发送）
     */
    receiveMessage(characterId: string, message: ChatMessage): void {
        const session = this._sessions.get(characterId);
        if (!session) return;

        // 设置消息时间戳
        if (message.timestamp === 0) {
            message.timestamp = Date.now();
        }

        session.messages.push(message);
        session.lastMessageTime = message.timestamp;
        session.unreadCount++;

        // 播放提示音
        // AudioManager.playSFX('message_received');

        console.log(`[MessageSystem] 收到消息: ${message.content}`);
        this.emit('messageReceived', { characterId, message });
    }

    /**
     * 标记已读
     */
    markAsRead(characterId: string): void {
        const session = this._sessions.get(characterId);
        if (!session) return;

        for (const msg of session.messages) {
            msg.read = true;
        }
        session.unreadCount = 0;

        this.emit('messagesRead', { characterId });
    }

    // ==================== 触发器 ====================

    /**
     * 触发聊天事件
     */
    triggerChat(triggerId: string): void {
        const trigger = this._triggers.find(t => t.id === triggerId);
        if (!trigger || trigger.triggered) {
            return;
        }

        // 检查好感要求
        const character = CharacterSystem.instance.getCharacter(trigger.characterId);
        if (character && trigger.requiredFavor && character.favor < trigger.requiredFavor) {
            return;
        }

        // 标记为已触发
        if (trigger.oneTime) {
            trigger.triggered = true;
        }

        // 发送消息
        for (const msg of trigger.messages) {
            this.receiveMessage(trigger.characterId, { ...msg, id: `${msg.id}_${Date.now()}` });
        }

        console.log(`[MessageSystem] 触发聊天: ${triggerId}`);
        this.emit('chatTriggered', { trigger });
    }

    /**
     * 检查事件触发条件
     */
    checkEventTriggers(eventId: string): void {
        const triggers = this._triggers.filter(t => 
            t.type === 'event' && 
            t.condition === eventId && 
            !t.triggered
        );

        for (const trigger of triggers) {
            this.triggerChat(trigger.id);
        }
    }

    /**
     * 安排回复（延迟发送）
     */
    private scheduleReply(characterId: string): void {
        // 随机延迟1-3秒后回复
        const delay = 1000 + Math.random() * 2000;
        
        setTimeout(() => {
            this.sendAutoReply(characterId);
        }, delay);
    }

    /**
     * 发送自动回复
     */
    private sendAutoReply(characterId: string): void {
        const replies = [
            '好呀~ 😊',
            '嗯嗯，知道了！',
            '哈哈，这样啊~',
            '我也在想你呢 ❤️',
            '那明天见！',
            '加油哦 💪',
        ];

        const replyText = replies[Math.floor(Math.random() * replies.length)];
        
        const message: ChatMessage = {
            id: `msg_auto_${Date.now()}`,
            type: MessageType.TEXT,
            direction: MessageDirection.INCOMING,
            senderId: characterId,
            content: replyText,
            timestamp: Date.now(),
            read: false,
        };

        this.receiveMessage(characterId, message);
    }

    /**
     * 处理快速回复
     */
    private handleQuickReply(characterId: string, replyId: string): void {
        const replies = QUICK_REPLIES[characterId] || [];
        const reply = replies.find(r => r.id === replyId);
        
        if (reply) {
            // 好感度变化
            CharacterSystem.instance.changeFavor(characterId, reply.favorChange);
            
            console.log(`[MessageSystem] 快速回复: ${reply.text}, 好感+${reply.favorChange}`);
        }
    }

    // ==================== 查询功能 ====================

    /**
     * 获取会话
     */
    getSession(characterId: string): ChatSession | undefined {
        return this._sessions.get(characterId);
    }

    /**
     * 获取所有会话
     */
    getAllSessions(): ChatSession[] {
        return Array.from(this._sessions.values());
    }

    /**
     * 获取未读消息总数
     */
    getTotalUnreadCount(): number {
        let total = 0;
        for (const session of this._sessions.values()) {
            total += session.unreadCount;
        }
        return total;
    }

    /**
     * 获取快速回复选项
     */
    getQuickReplies(characterId: string): QuickReply[] {
        return QUICK_REPLIES[characterId] || [];
    }

    /**
     * 获取可用触发器
     */
    getAvailableTriggers(characterId: string): ChatTrigger[] {
        const character = CharacterSystem.instance.getCharacter(characterId);
        if (!character) return [];

        return this._triggers.filter(t => 
            t.characterId === characterId &&
            !t.triggered &&
            (!t.requiredFavor || character.favor >= t.requiredFavor)
        );
    }

    /**
     * 获取消息列表
     */
    getMessages(characterId: string): ChatMessage[] {
        return this._sessions.get(characterId)?.messages || [];
    }

    // ==================== 会话管理 ====================

    /**
     * 清空会话
     */
    clearSession(characterId: string): void {
        const session = this._sessions.get(characterId);
        if (session) {
            session.messages = [];
            session.unreadCount = 0;
        }
    }

    /**
     * 清空所有会话
     */
    clearAllSessions(): void {
        for (const session of this._sessions.values()) {
            session.messages = [];
            session.unreadCount = 0;
        }
        console.log('[MessageSystem] 清空所有会话');
    }

    // ==================== 存档相关 ====================

    /**
     * 导出数据
     */
    exportData(): Record<string, any> {
        const data: Record<string, any> = {};
        
        for (const [characterId, session] of this._sessions) {
            data[characterId] = {
                messages: session.messages,
                lastMessageTime: session.lastMessageTime,
                unreadCount: session.unreadCount,
            };
        }

        return data;
    }

    /**
     * 导入数据
     */
    importData(data: Record<string, any>): void {
        for (const [characterId, sessionData] of Object.entries(data)) {
            const session = this._sessions.get(characterId);
            if (session) {
                session.messages = sessionData.messages || [];
                session.lastMessageTime = sessionData.lastMessageTime || Date.now();
                session.unreadCount = sessionData.unreadCount || 0;
            }
        }
    }
}

// 导出
export const Messages = MessageSystem.instance;
