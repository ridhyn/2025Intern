import React from 'react';
import { SafeAreaView, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// ウェブでIframeを表示するための簡易コンポーネント
const IframeComponent = (props: { source: { uri: string } }) => {
  // @ts-ignore
  return <iframe src={props.source.uri} style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />;
};

const App = () => {
  // ネイティブ用とウェブ用のソースを定義
  const nativeSource = require('../../public/index.html');
  const webSource = { uri: '/index.html' };

  return (
    <SafeAreaView style={styles.container}>
      {Platform.OS === 'web' ? (
        // --- ウェブで実行された場合 ---
        <IframeComponent source={webSource} />
      ) : (
        // --- iOS/Androidで実行された場合 ---
        <WebView
          originWhitelist={['*']}
          source={nativeSource}
          allowFileAccess={true}
          style={styles.webview}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default App;