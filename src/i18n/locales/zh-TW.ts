import type { LocaleMessages } from '../types.js';

/**
 * Traditional Chinese (Taiwan) locale messages
 * All CCB messages must include "CCB" branding
 */
export const zhTW: LocaleMessages = {
  // Reminder messages
  'ccb.reminder.mistakes':
    '**CCB 錯誤預防** - 過去 ${days} 天內有 ${count} 個錯誤：',
  'ccb.reminder.memories':
    '**CCB 記憶回顧** - 找到 ${count} 個相關記憶：',
  'ccb.reminder.preferences':
    '**CCB 使用者偏好** - 從過去互動中學習：',
  'ccb.reminder.operationWarning':
    '**CCB 警告** - 發現類似過往錯誤：${content}',

  // Preference summary
  'ccb.preference.summary': '**CCB 使用者偏好學習**',
  'ccb.preference.likes': '使用者喜好',
  'ccb.preference.dislikes': '使用者不喜歡',
  'ccb.preference.rules': '行為規則',

  // Secret management
  'ccb.secret.confirmation':
    '**CCB 秘密儲存** - 儲存秘密「${secretName}」(${maskedValue})？將於 ${expiresIn} 後過期。',
  'ccb.secret.privacyNotice':
    '**CCB 隱私聲明** - 此秘密使用 AES-256-GCM 加密儲存於本機。絕不會透過網路傳輸。',
  'ccb.secret.stored':
    '**CCB 秘密儲存** - 秘密「${secretName}」已安全儲存，${expiresIn} 後過期。',
  'ccb.secret.detected':
    '**CCB 秘密偵測** - 在內容中偵測到 ${count} 個潛在秘密。是否要安全儲存？',
  'ccb.secret.deleted':
    '**CCB 秘密儲存** - 秘密「${secretName}」已刪除。',
  'ccb.secret.notFound':
    '**CCB 秘密儲存** - 找不到秘密「${secretName}」。',
  'ccb.secret.expired':
    '**CCB 秘密儲存** - 秘密「${secretName}」已過期並被移除。',

  // Rule reminders
  'ccb.rule.readBeforeEdit':
    '⛔ **CCB 預防機制** - 編輯前必須先讀取檔案。您必須先閱讀檔案內容才能進行修改。',
  'ccb.rule.readBeforeEdit.suggestion':
    '請先使用 Read 工具查看檔案內容，然後再進行編輯。',
  'ccb.rule.verifyBeforeClaim':
    '⚠️ **CCB 驗證機制** - 宣稱完成前是否已驗證？請執行測試並檢查輸出。',
  'ccb.rule.verifyBeforeClaim.suggestion':
    '請執行測試、運行程式碼或驗證變更，確認無誤後再宣稱任務完成。',
  'ccb.rule.scopeCreep':
    '⚠️ **CCB 範圍檢查** - 修改範圍可能超出使用者的要求。您修改的檔案數量超出預期。',
  'ccb.rule.scopeCreep.suggestion':
    '請檢視原始需求，確保只修改範圍內的檔案。如有需要，請先向使用者確認。',

  // Preference violation
  'ccb.preference.violation':
    '**CCB 偏好警告** - 此操作可能與您的偏好設定衝突，請在繼續前確認。',

  // Common UI messages
  'ccb.status.loading': '**CCB** - 載入中...',
  'ccb.status.success': '**CCB** - 操作成功完成。',
  'ccb.status.error': '**CCB** - 發生錯誤：${message}',
  'ccb.status.warning': '**CCB** - 警告：${message}',

  // Knowledge graph messages
  'ccb.knowledge.saved': '**CCB 知識庫** - 記憶已成功儲存。',
  'ccb.knowledge.retrieved':
    '**CCB 知識庫** - 已擷取 ${count} 個相關記憶。',
  'ccb.knowledge.notFound': '**CCB 知識庫** - 找不到相關記憶。',

  // Prevention hook messages
  'ccb.hook.blocked':
    '**CCB 預防機制** - 操作因違反預防規則而被阻止。',
  'ccb.hook.warning':
    '**CCB 警告** - 偵測到潛在問題。請在繼續前檢視。',
  'ccb.hook.confirmationRequired':
    '**CCB 確認** - 此操作需要使用者確認後才能繼續。',
  'ccb.hook.patternExtracted':
    '**CCB 學習** - 已從錯誤中擷取預防模式。',
  'ccb.hook.extractionFailed':
    '**CCB 錯誤** - 無法擷取預防模式。',
};
