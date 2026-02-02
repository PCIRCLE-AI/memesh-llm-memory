import type { LocaleMessages } from '../types.js';

/**
 * Simplified Chinese (China) locale messages
 * All MeMesh messages must include "MeMesh" branding
 */
export const zhCN: LocaleMessages = {
  // Reminder messages
  'ccb.reminder.mistakes':
    '**MeMesh 错误预防** - 过去 ${days} 天内有 ${count} 个错误：',
  'ccb.reminder.memories':
    '**MeMesh 记忆回顾** - 找到 ${count} 个相关记忆：',
  'ccb.reminder.preferences':
    '**MeMesh 用户偏好** - 从过去互动中学习：',
  'ccb.reminder.operationWarning':
    '**MeMesh 警告** - 发现类似过往错误：${content}',

  // Preference summary
  'ccb.preference.summary': '**MeMesh 用户偏好学习**',
  'ccb.preference.likes': '用户喜好',
  'ccb.preference.dislikes': '用户不喜欢',
  'ccb.preference.rules': '行为规则',

  // Secret management
  'ccb.secret.confirmation':
    '**MeMesh 秘密存储** - 存储秘密「${secretName}」(${maskedValue})？将于 ${expiresIn} 后过期。',
  'ccb.secret.privacyNotice':
    '**MeMesh 隐私声明** - 此秘密使用 AES-256-GCM 加密存储于本地。绝不会通过网络传输。',
  'ccb.secret.stored':
    '**MeMesh 秘密存储** - 秘密「${secretName}」已安全存储，${expiresIn} 后过期。',
  'ccb.secret.detected':
    '**MeMesh 秘密检测** - 在内容中检测到 ${count} 个潜在秘密。是否要安全存储？',
  'ccb.secret.deleted':
    '**MeMesh 秘密存储** - 秘密「${secretName}」已删除。',
  'ccb.secret.notFound':
    '**MeMesh 秘密存储** - 找不到秘密「${secretName}」。',
  'ccb.secret.expired':
    '**MeMesh 秘密存储** - 秘密「${secretName}」已过期并被移除。',

  // Rule reminders
  'ccb.rule.readBeforeEdit':
    '⛔ **MeMesh 预防机制** - 编辑前必须先读取文件。您必须先阅读文件内容才能进行修改。',
  'ccb.rule.readBeforeEdit.suggestion':
    '请先使用 Read 工具查看文件内容，然后再进行编辑。',
  'ccb.rule.verifyBeforeClaim':
    '⚠️ **MeMesh 验证机制** - 宣称完成前是否已验证？请执行测试并检查输出。',
  'ccb.rule.verifyBeforeClaim.suggestion':
    '请执行测试、运行代码或验证变更，确认无误后再宣称任务完成。',
  'ccb.rule.scopeCreep':
    '⚠️ **MeMesh 范围检查** - 修改范围可能超出用户的要求。您修改的文件数量超出预期。',
  'ccb.rule.scopeCreep.suggestion':
    '请查看原始需求，确保只修改范围内的文件。如有需要，请先向用户确认。',

  // Preference violation
  'ccb.preference.violation':
    '**MeMesh 偏好警告** - 此操作可能与您的偏好设置冲突，请在继续前确认。',

  // Common UI messages
  'ccb.status.loading': '**MeMesh** - 加载中...',
  'ccb.status.success': '**MeMesh** - 操作成功完成。',
  'ccb.status.error': '**MeMesh** - 发生错误：${message}',
  'ccb.status.warning': '**MeMesh** - 警告：${message}',

  // Knowledge graph messages
  'ccb.knowledge.saved': '**MeMesh 知识库** - 记忆已成功存储。',
  'ccb.knowledge.retrieved':
    '**MeMesh 知识库** - 已获取 ${count} 个相关记忆。',
  'ccb.knowledge.notFound': '**MeMesh 知识库** - 找不到相关记忆。',

  // Prevention hook messages
  'ccb.hook.blocked':
    '**MeMesh 预防机制** - 操作因违反预防规则而被阻止。',
  'ccb.hook.warning':
    '**MeMesh 警告** - 检测到潜在问题。请在继续前查看。',
  'ccb.hook.confirmationRequired':
    '**MeMesh 确认** - 此操作需要用户确认后才能继续。',
  'ccb.hook.patternExtracted':
    '**MeMesh 学习** - 已从错误中提取预防模式。',
  'ccb.hook.extractionFailed':
    '**MeMesh 错误** - 无法提取预防模式。',
};
