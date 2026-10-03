<div align="center">

# React Native Blur

**Blur native cho Expo và React Native, làm mờ được cả video.**

iOS dùng đúng chất liệu blur của hệ thống. Android dựng lại cùng chất liệu đó bằng `RenderEffect`, được hiệu chỉnh màu theo iOS.

[English](./README.md) · Tiếng Việt

<img src="https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/video-comparison.webp" width="720" alt="Trái: thư viện này làm mờ cả video đang phát. Phải: thư viện blur thông thường để video xuyên qua, vẫn sắc nét." />

<sub><b>Trái:</b> thư viện này, video phía sau lớp kính bị làm mờ như mọi thứ khác.<br/><b>Phải:</b> một thư viện blur React Native thông thường, bật blur nhưng video vẫn sắc nét.</sub>

</div>

---

## Vì sao cần thêm một thư viện blur?

Phần lớn thư viện blur cho React Native chạy ổn trên màn hình tĩnh, nhưng hỏng ở hai chỗ:

- **Video lọt qua lớp blur.** Trên Android, video phát trong `SurfaceView`, được hệ thống ghép thẳng lên trên cửa sổ app. Thư viện nào blur bằng cách chụp lại cây view thì không bao giờ thấy lớp này, nên video vẫn sắc nét phía sau "lớp kính".
- **Android bị xám và phẳng.** Chỉ một bước blur Gaussian cộng một lớp tint phẳng làm màu bị bạc đi. Sáng tối trộn thành một mảng xám, không giống chất liệu iOS trên cùng màn hình.

Thư viện này sửa cả hai:

<div align="center">
<img src="https://raw.githubusercontent.com/nguyenduy1412/react-native-blur/main/.github/assets/blur-comparison.jpg" width="100%" alt="Cùng một màn hình: không blur, thư viện này trên Android, trên iOS, và expo-blur trên Android" />
</div>

📖 **Bài viết chi tiết kèm video:** [Kaizer Blur, blur thật kể cả khi phía sau là video](https://kaizer-app.vercel.app) (mục *Library*).

## Tính năng

- 🎬 **Làm mờ được video**, kể cả trình phát dùng `SurfaceView` trên Android (`expo-video`, `react-native-video`).
- 🍎 **Chất liệu iOS thật**: `UIVisualEffectView` với các style blur của hệ thống.
- 🤖 **Android khớp màu với iOS**: chuỗi `RenderEffect` (blur Gaussian rồi ColorMatrix) cho từng chất liệu, sai lệch trung bình **1,95/255** trên 187 mẫu màu so với ảnh chụp iOS.
- ✨ **Viền kính**: highlight bắt sáng ở cạnh trên, tạo cảm giác tấm kính có độ dày.
- 🌗 **Theo giao diện sáng/tối** trên Android.
- 🎚️ **Một prop `intensity`** (0–100) điều khiển cùng lúc blur, màu và viền.
- 🌐 **Web** dùng CSS `backdrop-filter`.

## Cài đặt

```sh
npx expo install @nguyenduy1412/react-native-blur
```

Thư viện có code native nên **không chạy trong Expo Go**. Bạn cần build lại development build:

```sh
npx expo run:ios
npx expo run:android
```

**React Native thuần (không Expo):** cài Expo Modules trước bằng `npx install-expo-modules@latest`, rồi chạy `cd ios && pod install`.

**Yêu cầu:** iOS 15.1+. Android API 31+ (Android 12) mới có blur; máy cũ hơn chỉ hiện tint và viền. Đã kiểm tra với Expo SDK 57 và React Native 0.86.

## Bắt đầu nhanh

`BlurView` làm mờ **nội dung nằm bên trong nó**. Bọc màn hình hoặc phần giao diện cần làm mờ:

```tsx
import BlurView from "@nguyenduy1412/react-native-blur";

export default function Screen() {
  return (
    <BlurView style={{ flex: 1 }} intensity={50} tint="systemMaterial">
      <YourContent />
    </BlurView>
  );
}
```

> [!IMPORTANT]
> Trên Android, blur được áp lên **các view con**. Một `<BlurView />` rỗng đặt đè lên view khác sẽ không có gì để làm mờ, nên chỉ hiện tint và viền. Hãy đặt nội dung cần làm mờ vào bên trong `BlurView`.

## Ví dụ

**Bật/tắt blur cho cả màn hình.** Giữ nguyên nội dung và đổi `intensity`; `0` là tắt hẳn.

```tsx
<BlurView style={{ flex: 1 }} intensity={blurred ? 60 : 0}>
  <Feed />
</BlurView>
```

**Thẻ kính mờ.** `borderRadius` cắt góc cả blur, tint và viền; cũng đọc được từ `style.borderRadius`.

```tsx
<BlurView intensity={70} tint="systemThinMaterial" style={{ borderRadius: 24, padding: 20 }}>
  <Text>Kính mờ</Text>
</BlurView>
```

**Làm mờ video đang phát.** Không cần cấu hình gì thêm.

```tsx
<BlurView style={{ flex: 1 }} intensity={60}>
  <VideoView player={player} style={{ flex: 1 }} />
</BlurView>
```

## Props

Nhận mọi prop của `View`, cộng thêm:

| Prop | Kiểu | Mặc định | Nền tảng | Mô tả |
| --- | --- | --- | --- | --- |
| `intensity` | `number` | `50` | iOS, Android, Web | Độ mạnh của toàn bộ hiệu ứng, `0`–`100`. `0` là tắt. |
| `tint` | `BlurTint` | `'default'` | iOS, Android, Web | Chất liệu blur, xem bảng trong [README tiếng Anh](./README.md#tint-values). |
| `tintColor` | `string` | — | iOS, Android, Web | Lớp màu phủ thêm trên blur, ví dụ `'rgba(0,0,0,0.3)'`. |
| `borderRadius` | `number` | `style.borderRadius` hoặc `0` | iOS, Android | Bo góc cho blur, tint và viền. |
| `blurRadius` | `number` | theo `tint` | Android, Web | Ghi đè bán kính blur của chất liệu (dp). |
| `saturation` | `number` | `1` | Android, Web | Hệ số nhân độ bão hoà màu của chất liệu. |

## Giới hạn

- **Android 11 trở xuống** không có `RenderEffect`, chỉ hiện tint và viền.
- **`blurRadius` và `saturation`** không có tác dụng trên iOS, vì iOS dùng nguyên chất liệu của hệ thống.
- **Video trên Android** được chép khung hình khoảng 30 fps ở 1/4 độ phân giải. Khi đã blur thì không nhìn ra, nhưng ở `intensity` rất thấp có thể thấy.
- **Độ khớp màu:** Android xấp xỉ đường cong độ sáng của iOS bằng một ma trận màu, nên lệch trung bình khoảng 2/255. Riêng `systemChromeMaterial` lệch nhiều nhất, tới khoảng 23/255.
- **Blur áp lên view con.** Muốn làm mờ nội dung nằm *phía sau* một lớp phủ, hãy đặt nội dung đó vào trong `BlurView` thay vì đặt một `BlurView` rỗng lên trên.

## Giấy phép

[MIT](./LICENSE) © nguyenduy1412
