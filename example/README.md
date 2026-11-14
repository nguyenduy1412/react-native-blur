# BlurExample

React Native CLI 0.86 app used to test `@nguyenduy1412/react-native-blur` on iOS and Android. It links the library from the parent directory.

```sh
cd example
npm install
cd ios && bundle exec pod install && cd ..
npm start
npm run ios      # or: npm run android
```

Screens: `header`, `content`, `tint`, `corners`, `theme`, `anim`, `modal`. Switch with a deep link, for example `blurexample://modal` or `blurexample://theme?scheme=dark`. For automated runs the app also polls `http://localhost:8099/route.txt` for the current deep link.
