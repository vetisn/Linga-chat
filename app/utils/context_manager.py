#!/usr/bin/env python3
"""
上下文管理器 - 优化token使用
"""

from typing import List, Dict, Any, Optional
from app.utils.logger import logger

class ContextManager:
    """智能上下文管理，减少不必要的token使用"""
    
    @staticmethod
    def optimize_messages(messages: List[Dict[str, Any]], max_turns: int = 6) -> List[Dict[str, Any]]:
        """
        优化消息上下文，限制对话轮数
        
        Args:
            messages: 原始消息列表
            max_turns: 最大对话轮数（一轮 = 用户消息 + AI回复）
        
        Returns:
            优化后的消息列表
        """
        if not messages:
            return messages
        
        logger.log_performance("上下文分析", 0, {
            "original_messages": len(messages),
            "max_turns": max_turns
        })
        
        # 如果消息数量很少，直接返回
        if len(messages) <= max_turns * 2:  # 每轮2条消息
            return messages
        
        # 保留策略：
        # 1. 保留系统消息
        # 2. 保留最后N轮对话（用户+AI回复）
        
        optimized = []
        
        # 先提取系统消息
        system_messages = [msg for msg in messages if msg.get('role') == 'system']
        non_system_messages = [msg for msg in messages if msg.get('role') != 'system']
        
        # 添加系统消息
        optimized.extend(system_messages)
        
        # 从后往前保留最后N轮对话
        # 确保保留完整的对话轮次（用户消息+AI回复）
        turns_kept = 0
        i = len(non_system_messages) - 1
        temp_messages = []
        
        while i >= 0 and turns_kept < max_turns:
            current_msg = non_system_messages[i]
            temp_messages.insert(0, current_msg)
            
            # 如果是用户消息，说明这是一轮对话的开始
            if current_msg.get('role') == 'user':
                turns_kept += 1
            
            i -= 1
        
        # 添加保留的对话消息
        optimized.extend(temp_messages)
        
        logger.log_performance("上下文优化", 0, {
            "optimized_messages": len(optimized),
            "turns_kept": turns_kept,
            "system_messages": len(system_messages),
            "reduction_ratio": f"{(1 - len(optimized)/len(messages))*100:.1f}%" if messages else "0%"
        })
        
        return optimized
    
    @staticmethod
    def should_enable_tools(user_input: str, conversation_settings: Dict[str, bool]) -> Dict[str, bool]:
        """
        智能判断是否需要启用工具
        
        Args:
            user_input: 用户输入
            conversation_settings: 对话设置
        
        Returns:
            优化后的工具启用状态
        """
        # 关键词检测
        time_keywords = ['时间', '现在', '几点', '日期', 'time', 'date']
        calc_keywords = ['计算', '算', '+', '-', '*', '/', '=', '数学']
        search_keywords = ['搜索', '查找', '最新', '新闻', '实时', '当前']
        
        user_lower = user_input.lower()
        
        # 智能启用工具
        smart_tools = {
            'knowledge_base': conversation_settings.get('knowledge_base', False),
            'mcp': conversation_settings.get('mcp', False),
            'web_search': conversation_settings.get('web_search', False)
        }
        
        # 如果用户输入很简单，可能不需要复杂工具
        if len(user_input.strip()) < 10:
            # 短输入，只保留必要工具
            if not any(keyword in user_lower for keyword in time_keywords + calc_keywords):
                smart_tools['web_search'] = False
        
        # 如果明确需要搜索
        if any(keyword in user_lower for keyword in search_keywords):
            smart_tools['web_search'] = True
        
        logger.log_performance("工具智能选择", 0, {
            "user_input_length": len(user_input),
            "original_tools": conversation_settings,
            "smart_tools": smart_tools
        })
        
        return smart_tools