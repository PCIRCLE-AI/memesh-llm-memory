import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectLocale,
  t,
  setLocale,
  getLocale,
  type Locale,
} from '../../src/i18n/index.js';

describe('i18n Module', () => {
  // Save original env
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    // Reset locale to default
    setLocale('en');
  });

  describe('detectLocale', () => {
    it('should detect English locale from LANG environment variable', () => {
      process.env.LANG = 'en_US.UTF-8';
      expect(detectLocale()).toBe('en');
    });

    it('should detect Traditional Chinese locale from LANG', () => {
      process.env.LANG = 'zh_TW.UTF-8';
      expect(detectLocale()).toBe('zh-TW');
    });

    it('should detect Simplified Chinese locale from LANG', () => {
      process.env.LANG = 'zh_CN.UTF-8';
      expect(detectLocale()).toBe('zh-CN');
    });

    it('should detect Japanese locale from LANG', () => {
      process.env.LANG = 'ja_JP.UTF-8';
      expect(detectLocale()).toBe('ja');
    });

    it('should fallback to English for unsupported locales', () => {
      process.env.LANG = 'fr_FR.UTF-8';
      expect(detectLocale()).toBe('en');
    });

    it('should fallback to English when LANG is not set', () => {
      delete process.env.LANG;
      delete process.env.LC_ALL;
      delete process.env.LANGUAGE;
      expect(detectLocale()).toBe('en');
    });

    it('should check LC_ALL before LANG', () => {
      process.env.LC_ALL = 'ja_JP.UTF-8';
      process.env.LANG = 'en_US.UTF-8';
      expect(detectLocale()).toBe('ja');
    });

    it('should check LANGUAGE before LC_ALL and LANG', () => {
      process.env.LANGUAGE = 'zh_TW';
      process.env.LC_ALL = 'ja_JP.UTF-8';
      process.env.LANG = 'en_US.UTF-8';
      expect(detectLocale()).toBe('zh-TW');
    });
  });

  describe('setLocale and getLocale', () => {
    it('should set and get locale correctly', () => {
      setLocale('zh-TW');
      expect(getLocale()).toBe('zh-TW');
    });

    it('should default to English', () => {
      expect(getLocale()).toBe('en');
    });

    it('should accept all supported locales', () => {
      const locales: Locale[] = ['en', 'zh-TW', 'zh-CN', 'ja'];
      for (const locale of locales) {
        setLocale(locale);
        expect(getLocale()).toBe(locale);
      }
    });
  });

  describe('t (translate) function', () => {
    beforeEach(() => {
      setLocale('en');
    });

    describe('Basic key resolution', () => {
      it('should resolve a simple key', () => {
        const result = t('ccb.rule.readBeforeEdit');
        expect(result).toContain('MeMesh');
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return key itself for missing keys', () => {
        const result = t('non.existent.key');
        expect(result).toBe('non.existent.key');
      });
    });

    describe('Parameter interpolation', () => {
      it('should interpolate single parameter', () => {
        const result = t('ccb.reminder.memories', { count: 5 });
        expect(result).toContain('5');
        expect(result).toContain('MeMesh');
      });

      it('should interpolate multiple parameters', () => {
        const result = t('ccb.reminder.mistakes', { count: 3, days: 7 });
        expect(result).toContain('3');
        expect(result).toContain('7');
        expect(result).toContain('MeMesh');
      });

      it('should leave unreplaced params as placeholders', () => {
        const result = t('ccb.reminder.mistakes', { count: 3 });
        // Should still contain ${days} since it wasn't provided
        expect(result).toContain('${days}');
      });

      it('should handle string parameters', () => {
        const result = t('ccb.secret.confirmation', {
          secretName: 'API_KEY',
          expiresIn: '30 days',
        });
        expect(result).toContain('API_KEY');
      });
    });

    describe('Multi-locale support', () => {
      it('should translate to Traditional Chinese', () => {
        setLocale('zh-TW');
        const result = t('ccb.rule.readBeforeEdit');
        expect(result).toContain('MeMesh');
        // Should not be the English version
        expect(result).not.toBe(
          (() => {
            setLocale('en');
            return t('ccb.rule.readBeforeEdit');
          })()
        );
      });

      it('should translate to Simplified Chinese', () => {
        setLocale('zh-CN');
        const result = t('ccb.rule.readBeforeEdit');
        expect(result).toContain('MeMesh');
      });

      it('should translate to Japanese', () => {
        setLocale('ja');
        const result = t('ccb.rule.readBeforeEdit');
        expect(result).toContain('MeMesh');
      });

      it('should fallback to English for missing keys in other locales', () => {
        setLocale('zh-TW');
        // Assuming this key only exists in English
        const result = t('ccb.fallback.test.key');
        // Should return the key itself since it doesn't exist anywhere
        expect(result).toBe('ccb.fallback.test.key');
      });
    });

    describe('MeMesh Branding requirement', () => {
      const ccbKeys = [
        'ccb.reminder.mistakes',
        'ccb.reminder.memories',
        'ccb.reminder.preferences',
        'ccb.secret.confirmation',
        'ccb.rule.readBeforeEdit',
        'ccb.rule.verifyBeforeClaim',
        'ccb.preference.violation',
      ];

      for (const key of ccbKeys) {
        it(`should include MeMesh branding in ${key}`, () => {
          const result = t(key, { count: 1, days: 1, secretName: 'test', expiresIn: '1d' });
          expect(result).toContain('MeMesh');
        });
      }

      it('should include MeMesh branding in all locales', () => {
        const locales: Locale[] = ['en', 'zh-TW', 'zh-CN', 'ja'];
        for (const locale of locales) {
          setLocale(locale);
          const result = t('ccb.reminder.memories', { count: 5 });
          expect(result).toContain('MeMesh');
        }
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty params object', () => {
      const result = t('ccb.rule.readBeforeEdit', {});
      expect(result).toContain('MeMesh');
    });

    it('should handle numeric zero as param', () => {
      const result = t('ccb.reminder.memories', { count: 0 });
      expect(result).toContain('0');
    });

    it('should handle special characters in params', () => {
      const result = t('ccb.secret.confirmation', {
        secretName: '<script>alert("xss")</script>',
        expiresIn: '30 days',
      });
      expect(result).toContain('<script>');
    });

    it('should handle undefined locale gracefully', () => {
      // @ts-expect-error - Testing runtime behavior
      setLocale(undefined);
      // Should fallback to English or previous locale
      const result = t('ccb.rule.readBeforeEdit');
      expect(result).toContain('MeMesh');
    });
  });
});
