import type { LocaleMessages } from '../types.js';

/**
 * English locale messages (default)
 * All MeMesh messages must include "MeMesh" branding
 */
export const en: LocaleMessages = {
  // Reminder messages
  'ccb.reminder.mistakes':
    '**MeMesh Mistake Prevention** - ${count} mistakes in last ${days} days:',
  'ccb.reminder.memories':
    '**MeMesh Memory Recall** - Found ${count} related memories:',
  'ccb.reminder.preferences':
    '**MeMesh User Preferences** - Learned from past interactions:',
  'ccb.reminder.operationWarning':
    '**MeMesh Warning** - Similar mistake before: ${content}',

  // Preference summary
  'ccb.preference.summary': '**MeMesh User Preference Learning**',
  'ccb.preference.likes': 'User Likes',
  'ccb.preference.dislikes': 'User Dislikes',
  'ccb.preference.rules': 'Behavior Rules',

  // Rule reminders
  'ccb.rule.readBeforeEdit':
    '⛔ **MeMesh Prevention** - Cannot edit without reading first. You must read the file before making changes.',
  'ccb.rule.readBeforeEdit.suggestion':
    'Use the Read tool to view the file contents first, then proceed with your edit.',
  'ccb.rule.verifyBeforeClaim':
    '⚠️ **MeMesh Verification** - Have you verified before claiming completion? Run tests and check outputs.',
  'ccb.rule.verifyBeforeClaim.suggestion':
    'Execute tests, run the code, or verify the changes before claiming the task is complete.',
  'ccb.rule.scopeCreep':
    '⚠️ **MeMesh Scope Check** - Modifications may exceed the user\'s request. You have modified more files than expected.',
  'ccb.rule.scopeCreep.suggestion':
    'Review the original request and ensure you are only modifying files within scope. Ask user for confirmation if needed.',

  // Preference violation
  'ccb.preference.violation':
    '**MeMesh Preference Alert** - This action may conflict with your stated preferences. Please review before proceeding.',

  // Common UI messages
  'ccb.status.loading': '**MeMesh** - Loading...',
  'ccb.status.success': '**MeMesh** - Operation completed successfully.',
  'ccb.status.error': '**MeMesh** - An error occurred: ${message}',
  'ccb.status.warning': '**MeMesh** - Warning: ${message}',

  // Knowledge graph messages
  'ccb.knowledge.saved': '**MeMesh Knowledge** - Memory saved successfully.',
  'ccb.knowledge.retrieved':
    '**MeMesh Knowledge** - Retrieved ${count} relevant memories.',
  'ccb.knowledge.notFound': '**MeMesh Knowledge** - No relevant memories found.',

  // Prevention hook messages
  'ccb.hook.blocked':
    '**MeMesh Prevention** - Operation blocked due to prevention rule violation.',
  'ccb.hook.warning':
    '**MeMesh Warning** - Potential issue detected. Please review before proceeding.',
  'ccb.hook.confirmationRequired':
    '**MeMesh Confirmation** - This operation requires user confirmation before proceeding.',
  'ccb.hook.patternExtracted':
    '**MeMesh Learning** - Prevention pattern extracted from mistake.',
  'ccb.hook.extractionFailed':
    '**MeMesh Error** - Failed to extract prevention pattern.',

  // Mistake recording messages (Phase 0.7.0)
  'ccb.mistake.recorded':
    '**MeMesh Mistake Recorded**\n\nPreventionRule: ${ruleCreated}\nPreference: ${prefCreated}',
  'ccb.mistake.error': '**MeMesh Mistake Recording Failed** - ${message}',
};
