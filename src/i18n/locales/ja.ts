import type { LocaleMessages } from '../types.js';

/**
 * Japanese locale messages
 * All CCB messages must include "CCB" branding
 */
export const ja: LocaleMessages = {
  // Reminder messages
  'ccb.reminder.mistakes':
    '**CCB エラー防止** - 過去 ${days} 日間に ${count} 件のエラー：',
  'ccb.reminder.memories':
    '**CCB メモリー呼び出し** - ${count} 件の関連メモリーが見つかりました：',
  'ccb.reminder.preferences':
    '**CCB ユーザー設定** - 過去のやり取りから学習：',
  'ccb.reminder.operationWarning':
    '**CCB 警告** - 過去に同様のミスがありました：${content}',

  // Preference summary
  'ccb.preference.summary': '**CCB ユーザー設定学習**',
  'ccb.preference.likes': 'ユーザーの好み',
  'ccb.preference.dislikes': 'ユーザーの嫌いなもの',
  'ccb.preference.rules': '行動ルール',

  // Secret management
  'ccb.secret.confirmation':
    '**CCB シークレット保存** - シークレット「${secretName}」(${maskedValue})を保存しますか？${expiresIn} 後に期限切れになります。',
  'ccb.secret.privacyNotice':
    '**CCB プライバシー通知** - このシークレットはAES-256-GCM暗号化を使用してローカルに保存されます。ネットワーク経由で転送されることはありません。',
  'ccb.secret.stored':
    '**CCB シークレット保存** - シークレット「${secretName}」は安全に保存されました。${expiresIn} 後に期限切れになります。',
  'ccb.secret.detected':
    '**CCB シークレット検出** - コンテンツ内に ${count} 件の潜在的なシークレットが検出されました。安全に保存しますか？',
  'ccb.secret.deleted':
    '**CCB シークレット保存** - シークレット「${secretName}」が削除されました。',
  'ccb.secret.notFound':
    '**CCB シークレット保存** - シークレット「${secretName}」が見つかりませんでした。',
  'ccb.secret.expired':
    '**CCB シークレット保存** - シークレット「${secretName}」は期限切れとなり、削除されました。',

  // Rule reminders
  'ccb.rule.readBeforeEdit':
    '⛔ **CCB 防止機能** - 読み込まずに編集することはできません。変更を加える前にファイルを読む必要があります。',
  'ccb.rule.readBeforeEdit.suggestion':
    'まず Read ツールを使用してファイルの内容を確認し、その後編集を進めてください。',
  'ccb.rule.verifyBeforeClaim':
    '⚠️ **CCB 検証機能** - 完了を主張する前に検証しましたか？テストを実行し、出力を確認してください。',
  'ccb.rule.verifyBeforeClaim.suggestion':
    'タスクの完了を主張する前に、テストを実行し、コードを実行するか、変更を検証してください。',
  'ccb.rule.scopeCreep':
    '⚠️ **CCB スコープチェック** - 変更がユーザーの要求を超えている可能性があります。予想より多くのファイルを変更しています。',
  'ccb.rule.scopeCreep.suggestion':
    '元のリクエストを確認し、スコープ内のファイルのみを変更していることを確認してください。必要に応じて、ユーザーに確認を求めてください。',

  // Preference violation
  'ccb.preference.violation':
    '**CCB 設定アラート** - この操作はあなたの設定と競合する可能性があります。続行する前に確認してください。',

  // Common UI messages
  'ccb.status.loading': '**CCB** - 読み込み中...',
  'ccb.status.success': '**CCB** - 操作が正常に完了しました。',
  'ccb.status.error': '**CCB** - エラーが発生しました：${message}',
  'ccb.status.warning': '**CCB** - 警告：${message}',

  // Knowledge graph messages
  'ccb.knowledge.saved': '**CCB ナレッジ** - メモリーが正常に保存されました。',
  'ccb.knowledge.retrieved':
    '**CCB ナレッジ** - ${count} 件の関連メモリーを取得しました。',
  'ccb.knowledge.notFound': '**CCB ナレッジ** - 関連メモリーが見つかりませんでした。',

  // Prevention hook messages
  'ccb.hook.blocked':
    '**CCB 防止機能** - 防止ルール違反のため操作がブロックされました。',
  'ccb.hook.warning':
    '**CCB 警告** - 潜在的な問題が検出されました。続行する前に確認してください。',
  'ccb.hook.confirmationRequired':
    '**CCB 確認** - この操作を続行するにはユーザーの確認が必要です。',
  'ccb.hook.patternExtracted':
    '**CCB 学習** - ミスから防止パターンを抽出しました。',
  'ccb.hook.extractionFailed':
    '**CCB エラー** - 防止パターンの抽出に失敗しました。',
};
