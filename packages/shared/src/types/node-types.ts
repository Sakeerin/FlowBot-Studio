// Node type definitions
export type NodeType =
  | 'Start'
  | 'Message'
  | 'AskCollect'
  | 'Condition'
  | 'Router'
  | 'ToolCall'
  | 'AIAnswer'
  | 'Handoff'
  | 'End';

export type MessageFormat = 'text' | 'markdown' | 'html';

export type VariableType = 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'object' | 'array';

export type ConditionOperator = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'exists';

export type LogicalOperator = 'AND' | 'OR';

export type HandoffPriority = 'low' | 'normal' | 'high' | 'urgent';

export type HandoffStatus = 'open' | 'assigned' | 'resolved' | 'closed';

