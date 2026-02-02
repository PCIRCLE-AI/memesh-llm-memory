# CLI Integration Tests

This directory contains integration tests for the MeMesh CLI components.

## Setup Wizard Integration Tests

**File**: `setup-wizard.integration.test.ts`

### Overview

Comprehensive integration tests for the interactive setup wizard that helps users configure MeMesh for Claude Code. The tests ensure the wizard properly handles various scenarios across different operating systems and edge cases.

### Test Coverage

**Total Test Cases**: 38
**All Passing**: ✅

#### Test Suites

1. **Complete Setup Flow (Happy Path)** - 4 tests
   - ✅ macOS setup with Claude Code detection
   - ✅ Windows setup with proper path handling
   - ✅ Linux setup with correct config paths
   - ✅ Success message display

2. **Claude Code Detection** - 5 tests
   - ✅ Detect on macOS (Applications)
   - ✅ Detect on macOS (user Applications)
   - ✅ Handle not found scenarios
   - ✅ Detect on Windows
   - ✅ Detect on Linux

3. **Config File Management** - 5 tests
   - ✅ Create config directory if missing
   - ✅ Backup existing config files
   - ✅ Generate valid JSON config
   - ✅ Validate config after creation
   - ✅ Handle JSON formatting with proper indentation

4. **User Cancellation** - 2 tests
   - ✅ Handle cancellation during configuration
   - ✅ Don't backup when user cancels

5. **Error Handling** - 7 tests
   - ✅ Permission errors during directory creation
   - ✅ Permission errors during config write
   - ✅ Invalid config paths
   - ✅ Backup failures
   - ✅ JSON parse errors during validation
   - ✅ Show troubleshooting steps on errors
   - ✅ Graceful error recovery

6. **Cross-Platform Path Handling** - 6 tests
   - ✅ Correct config paths for macOS
   - ✅ Correct config paths for Windows
   - ✅ Correct config paths for Linux
   - ✅ Windows path separator handling
   - ✅ Special characters in home directory
   - ✅ Path normalization across platforms

7. **Config Validation** - 5 tests
   - ✅ Validate required fields exist
   - ✅ Detect invalid config structure
   - ✅ Validate command specification
   - ✅ Validate args is an array
   - ✅ Validate env is an object

8. **Edge Cases** - 5 tests
   - ✅ Empty home directory handling
   - ✅ Very long paths support
   - ✅ Concurrent access handling
   - ✅ Symlinks in paths
   - ✅ Read-only config directory

### Test Architecture

#### Mocking Strategy

The tests use comprehensive mocking to isolate the setup wizard behavior:

```typescript
// File system operations
vi.mock('fs-extra')

// Logger
vi.mock('../../src/utils/logger.js')

// User input
vi.mock('inquirer')
```

#### Platform Simulation

Tests simulate different operating systems:

```typescript
mockPlatform('darwin')  // macOS
mockPlatform('win32')   // Windows
mockPlatform('linux')   // Linux
```

#### Test Utilities

- **mockHomedir()**: Simulates different home directory paths
- **createTestDirectory()**: Creates temporary test directories
- **mockInquirerPrompt()**: Simulates user input
- **mockConsole()**: Prevents console output during tests

### Running the Tests

```bash
# Run only setup wizard tests
npm test -- tests/cli/setup-wizard.integration.test.ts

# Run with verbose output
npm test -- tests/cli/setup-wizard.integration.test.ts --reporter=verbose

# Run with coverage
npm test -- tests/cli/setup-wizard.integration.test.ts --coverage
```

### Key Features Tested

1. **Cross-Platform Compatibility**
   - macOS: `~/Library/Application Support/Claude/`
   - Windows: `%APPDATA%\Claude\`
   - Linux: `~/.config/Claude/`

2. **Claude Code Detection**
   - Multiple installation paths per platform
   - Graceful handling when not found
   - Clear user feedback

3. **Config File Management**
   - Automatic backup of existing configs
   - Valid JSON generation with proper formatting
   - Structure validation (mcpServers.memesh)

4. **Error Recovery**
   - Permission errors
   - Invalid paths
   - Backup failures
   - Parse errors
   - Helpful troubleshooting messages

5. **User Experience**
   - Progress indicators during operations
   - Clear success/failure messages
   - Cancellation support
   - Next steps guidance

### Testing Best Practices

1. **Isolation**: Each test runs in a clean temporary directory
2. **Cleanup**: Automatic cleanup after each test
3. **Mock Restoration**: All mocks restored after tests
4. **Platform Restoration**: Original platform settings restored
5. **Comprehensive Coverage**: Edge cases and error scenarios

### File Structure

```
tests/cli/
├── README.md                           # This file
└── setup-wizard.integration.test.ts    # Setup wizard tests
```

### Integration with CI/CD

These tests are part of the main test suite and run on:
- Pre-commit hooks
- CI/CD pipelines
- Pull request validation
- Release verification

### Maintenance Notes

When modifying the setup wizard:

1. **Add Tests**: Add new test cases for new features
2. **Update Mocks**: Update mocks if dependencies change
3. **Platform Paths**: Update paths if config locations change
4. **Error Messages**: Update assertions if messages change

### Test Data

Tests use temporary directories created in `os.tmpdir()`:
- Unique directory per test run
- Automatic cleanup
- No impact on user's actual config

### Coverage Goals

- ✅ **Line Coverage**: 100% of setup-wizard.ts
- ✅ **Branch Coverage**: All error and success paths
- ✅ **Platform Coverage**: macOS, Windows, Linux
- ✅ **Error Scenarios**: Permission, validation, backup errors
- ✅ **User Flows**: Happy path, cancellation, retry

### Related Documentation

- Setup Wizard Source: `/src/cli/setup-wizard.ts`
- Progress Indicator: `/src/ui/ProgressIndicator.ts`
- Main Test Config: `/vitest.config.ts`

### Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include comments for complex scenarios
4. Mock external dependencies
5. Clean up test resources
6. Verify cross-platform compatibility

### Known Issues

None currently. All 38 tests passing.

### Future Enhancements

Potential areas for additional testing:
- Network-related setup scenarios
- Upgrade/migration workflows
- Multiple MCP server configurations
- Config validation edge cases
- Performance benchmarks
