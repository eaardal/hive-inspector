# Hive Inspector

[Hive](https://docs.hivedb.dev/) is a simple on-device database for Flutter/Dart.

However, a common issue with light-weight custom databases is the lack of inspector tools for reading its content.

This simple tool gives you a way to view the contents of a HiveBox while developing.

> :warning: This is just a proof of concept, not an active project.

## How it works

This project has a server and a frontend. The server listens on port 3001 for POST requests with HiveBox data as JSON:

```
http://localhost:3001/api/:HIVE_BOX_NAME
```

If the Hive box name is "categories" the URL would be `/api/categories`.

The server sends the given HiveBox data to the frontend via websockets where the data is displayed as JSON.

On the Flutter side, the data must be sent over HTTP when in development environment:

```dart
// hive_inspector_utils.dart
import 'dart:convert';
import 'dart:io';
import 'package:flex/infrastructure/json_serializable.dart';
import 'package:http/http.dart' as http;

class HiveInspectorUtils {
  static String apiEndpoint = "http://localhost:3001/api";

  static Future<void> sendHiveBoxToServer(
    String boxName,
    Iterable<JsonSerializable> boxData,
  ) async {
    var body = jsonEncode(boxData.map((b) => b.toJson()).toList());
    var url = Uri.parse("$apiEndpoint/$boxName");

    var res = await http.post(url, body: body, headers: {
      HttpHeaders.contentTypeHeader: "application/json",
    });

    res.statusCode == 200
        ? Log.d("Successfully sent $boxName to server")
        : Log.e("Failed to send $boxName to server: ${res.body}");

    return Future.value();
  }
}
```

For completeness, here's more code of how it's used on the Flutter side:

```dart
// category_repository.dart
class HiveCategoryRepository implements CategoryRepository {
  static const String boxName = "categories";

  final bool _enableHiveInspector;
  late Box<CategoryDTO> _categoriesBox;

  final BehaviorSubject<Iterable<CategoryDTO>> _rx = BehaviorSubject();

  HiveCategoryRepository(this._enableHiveInspector);

  @override
  Future<void> initialize() async {
    Log.d("Initializing ${runtimeType.toString()}");

    // Open the hive box
    _categoriesBox = await Hive.openBox<CategoryDTO>(boxName);

    // Add the current hive box state to the RX subject as the initial state.
    _rx.add(_categoriesBox.values);
    _inspectHiveBox();

    // Listen for changes to the hive box and set the RX subject's state to the current box state whenever changes occur.
    _categoriesBox.watch().forEach((event) {
      _rx.add(_categoriesBox.values);
      _inspectHiveBox();
    });
  }

  void _inspectHiveBox() {
    if (_enableHiveInspector) {
      HiveInspectorUtils.sendHiveBoxToServer(boxName, _categoriesBox.values);
    }
  }

  // ...Implementation of CRUD and RX streaming methods
}
```

The repository's `initialize` method is invoked during app startup before the root widget is rendered.

Also, all models stored in Hive boxes implements the `JsonSerializable` abstract class:

```dart
// json_serializable.dart
abstract class JsonSerializable {
  Map<String, dynamic> toJson();
}

// models/category_dto.dart
import 'package:hive/hive.dart';

part 'category_dto.g.dart';

@HiveType(typeId: KnownHiveTypes.categoryTypeId)
class CategoryDTO implements JsonSerializable {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  CategoryDTO(this.id, this.name);

  @override
  Map<String, dynamic> toJson() {
    return {
      "id": id,
      "name": name,
    };
  }
}
```

This makes it easy for the `HiveInspectorUtils.sendHiveBoxToServer` function to accept `Iterable<JsonSerializable> boxData` to serialize whatever Hive box data model to a HTTP request body payload as JSON.

## How to run

1. Run the web server

Uses [bun](https://bun.sh) instead of NodeJS due to the ease of running TypeScript directly.

```shell
npm run server
# OR
bun server.ts
```

Can test it with any HTTP/REST tester such as Posman or cURL:

```shell
curl --request POST -H "Content-Type: application/json" --url http://localhost:3001/api/myhivebox -d '{"foo":"bar"}'
```

A log statement in the console should confirm the requst was received successfully.

2. Run the NextJS frontend

```shell
npm run dev
# OR
npm run build
npm start
```

Go to http://localhost:3000

Sending the test POST request again should display the data automatically on the webpage.

3. Send Hive box data from your Flutter app. See code snippets above.
