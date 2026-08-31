# AccessGuard Mobile SDK

React Native SDK for mobile accessibility scanning on iOS and Android.

## Installation

```bash
npm install @accessguard/mobile-sdk
# or
yarn add @accessguard/mobile-sdk
```

## Quick Start

```tsx
import { useAccessGuard } from '@accessguard/mobile-sdk';

function App() {
  const { scanUrl, loading, error, lastResult } = useAccessGuard({
    apiKey: 'agk_...',
    projectId: 'proj_...',
    standard: 'wcag22aa',
  });

  const handleScan = async () => {
    const result = await scanUrl('https://example.com');
    if (result) {
      console.log(`Score: ${result.summary.score}%`);
      console.log(`Violations: ${result.violations.length}`);
    }
  };

  return (
    <View>
      <Button
        title={loading ? 'Scanning...' : 'Scan Website'}
        onPress={handleScan}
        disabled={loading}
      />
      {error && <Text>Error: {error}</Text>}
      {lastResult && (
        <View>
          <Text>Score: {lastResult.summary.score}%</Text>
          <Text>Critical: {lastResult.summary.critical}</Text>
          <Text>Serious: {lastResult.summary.serious}</Text>
        </View>
      )}
    </View>
  );
}
```

## API Reference

### `useAccessGuard(config)`

Returns an object with:
- `sdk` - SDK instance
- `loading` - Boolean indicating scan in progress
- `error` - Error message or null
- `lastResult` - Last scan result
- `scanUrl(url)` - Scan a URL
- `scanHtml(html, filePath?)` - Scan HTML content
- `checkCompliance(url)` - Quick compliance check

### `AccessGuardSDK(config)`

Direct SDK class:
- `scanUrl(url)` - Scan a URL
- `scanHtml(html, filePath?)` - Scan HTML content
- `getViolation(id)` - Get violation details
- `generateFix(id)` - Generate AI fix
- `getProject()` - Get project details
- `checkCompliance(url)` - Quick compliance check

## Platform Support

- iOS 13+
- Android API 24+

## License

MIT
