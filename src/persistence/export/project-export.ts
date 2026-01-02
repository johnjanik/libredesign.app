/**
 * Project Export System
 *
 * Export complete projects for Android (Gradle/Compose), iOS (Xcode), and TypeScript (React).
 * Based on kotlin-android-template best practices.
 */

import JSZip from 'jszip';
import type { NodeId } from '@core/types/common';
import type { SceneGraph } from '@scene/graph/scene-graph';
import { createAndroidCodeGenerator } from './android-code-generator';
import { createIOSCodeGenerator } from './ios-code-generator';
import { createTypeScriptReactGenerator } from './typescript-react-generator';

// =============================================================================
// Version Configuration (from kotlin-android-template)
// =============================================================================

export const ANDROID_VERSIONS = {
  // Gradle & Plugins
  agp: '8.13.2',
  kotlin: '2.3.0',
  composeCompiler: '1.5.5',
  detekt: '1.23.8',

  // SDK Versions
  minSdk: 23,
  targetSdk: 36,
  compileSdk: 36,

  // Compose BOM & Libraries
  composeBom: '2025.12.01',
  activityCompose: '1.12.2',

  // AndroidX
  appcompat: '1.7.1',
  coreKtx: '1.17.0',
  constraintLayout: '2.2.1',

  // Testing
  junit: '4.13.2',
  androidxTest: '1.7.0',
  androidxTestExt: '1.3.0',
  espresso: '3.7.0',
} as const;

export const IOS_VERSIONS = {
  swiftVersion: '5.9',
  iosDeploymentTarget: '17.0',
  xcodeVersion: '15.0',
} as const;

export const TYPESCRIPT_VERSIONS = {
  react: '^18.2.0',
  reactDom: '^18.2.0',
  typescript: '^5.3.0',
  vite: '^5.0.0',
} as const;

// =============================================================================
// Export Options
// =============================================================================

export interface AndroidProjectOptions {
  projectName: string;
  packageName: string;
  applicationId?: string;
  useCompose?: boolean;
  includeTests?: boolean;
}

export interface IOSProjectOptions {
  projectName: string;
  bundleId: string;
  organizationName?: string;
  deploymentTarget?: string;
}

export interface TypeScriptProjectOptions {
  projectName: string;
  useVite?: boolean;
  includeCss?: boolean;
}

// =============================================================================
// Android Project Export
// =============================================================================

export async function exportAndroidProject(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: AndroidProjectOptions
): Promise<Blob> {
  const zip = new JSZip();
  const {
    projectName,
    packageName,
    applicationId = packageName,
    useCompose = true,
    includeTests = true,
  } = options;

  const packagePath = packageName.replace(/\./g, '/');
  const generator = createAndroidCodeGenerator(sceneGraph);

  // Root build.gradle.kts
  zip.file('build.gradle.kts', generateRootBuildGradle());

  // Settings.gradle.kts
  zip.file('settings.gradle.kts', generateSettingsGradle(projectName));

  // gradle.properties
  zip.file('gradle.properties', generateGradleProperties());

  // Version catalog
  zip.file('gradle/libs.versions.toml', generateVersionsCatalog());

  // Gradle wrapper
  zip.file('gradle/wrapper/gradle-wrapper.properties', generateGradleWrapper());

  // App module build.gradle.kts
  zip.file('app/build.gradle.kts', generateAppBuildGradle(applicationId, useCompose));

  // AndroidManifest.xml
  zip.file('app/src/main/AndroidManifest.xml', generateAndroidManifest(packageName));

  // Generate code for each selected node
  for (const nodeId of nodeIds) {
    const node = sceneGraph.getNode(nodeId);
    if (!node) continue;

    const result = generator.generate(nodeId, {
      language: 'kotlin',
      framework: useCompose ? 'compose' : 'view',
      packageName,
      includePreview: true,
      includeComments: true,
    });

    const fileName = sanitizeFileName(node.name || 'Component');
    zip.file(`app/src/main/java/${packagePath}/${fileName}.kt`, result.code);

    // Add colors.xml if there are colors
    if (result.colorsXml) {
      zip.file('app/src/main/res/values/colors.xml', result.colorsXml);
    }
  }

  // MainActivity.kt
  zip.file(`app/src/main/java/${packagePath}/MainActivity.kt`, generateMainActivity(packageName, useCompose));

  // Theme files
  zip.file(`app/src/main/java/${packagePath}/ui/theme/Theme.kt`, generateComposeTheme(packageName));
  zip.file(`app/src/main/java/${packagePath}/ui/theme/Color.kt`, generateComposeColors(packageName));
  zip.file(`app/src/main/java/${packagePath}/ui/theme/Type.kt`, generateComposeTypography(packageName));

  // Tests
  if (includeTests) {
    zip.file(`app/src/test/java/${packagePath}/ExampleUnitTest.kt`, generateUnitTest(packageName));
    zip.file(`app/src/androidTest/java/${packagePath}/ExampleInstrumentedTest.kt`, generateInstrumentedTest(packageName));
  }

  // .gitignore
  zip.file('.gitignore', generateAndroidGitignore());

  // README
  zip.file('README.md', generateAndroidReadme(projectName));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// =============================================================================
// iOS Project Export
// =============================================================================

export async function exportIOSProject(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: IOSProjectOptions
): Promise<Blob> {
  const zip = new JSZip();
  const {
    projectName,
    bundleId,
    deploymentTarget = IOS_VERSIONS.iosDeploymentTarget,
  } = options;

  const generator = createIOSCodeGenerator(sceneGraph);

  // Project.pbxproj (simplified)
  const projectDir = `${projectName}.xcodeproj`;
  zip.file(`${projectDir}/project.pbxproj`, generateXcodeProject(projectName, bundleId, deploymentTarget));

  // Generate SwiftUI files for each node
  for (const nodeId of nodeIds) {
    const node = sceneGraph.getNode(nodeId);
    if (!node) continue;

    const result = generator.generate(nodeId, {
      language: 'swift',
      framework: 'swiftui',
      includeComments: true,
      includePreview: true,
    });

    const fileName = sanitizeFileName(node.name || 'Component');
    zip.file(`${projectName}/${fileName}.swift`, result.code);
  }

  // App entry point
  zip.file(`${projectName}/${projectName}App.swift`, generateSwiftApp(projectName));

  // ContentView.swift
  zip.file(`${projectName}/ContentView.swift`, generateContentView(projectName, nodeIds, sceneGraph));

  // Assets catalog
  zip.file(`${projectName}/Assets.xcassets/Contents.json`, JSON.stringify({
    info: { author: 'xcode', version: 1 }
  }, null, 2));

  zip.file(`${projectName}/Assets.xcassets/AccentColor.colorset/Contents.json`, JSON.stringify({
    colors: [{ idiom: 'universal' }],
    info: { author: 'xcode', version: 1 }
  }, null, 2));

  zip.file(`${projectName}/Assets.xcassets/AppIcon.appiconset/Contents.json`, JSON.stringify({
    images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024' }],
    info: { author: 'xcode', version: 1 }
  }, null, 2));

  // Preview Content
  zip.file(`${projectName}/Preview Content/Preview Assets.xcassets/Contents.json`, JSON.stringify({
    info: { author: 'xcode', version: 1 }
  }, null, 2));

  // Info.plist (not needed in modern Xcode projects but included for compatibility)
  zip.file(`${projectName}/Info.plist`, generateInfoPlist(bundleId, projectName));

  // .gitignore
  zip.file('.gitignore', generateIOSGitignore());

  // README
  zip.file('README.md', generateIOSReadme(projectName));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// =============================================================================
// TypeScript/React Project Export
// =============================================================================

export async function exportTypeScriptProject(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: TypeScriptProjectOptions
): Promise<Blob> {
  const zip = new JSZip();
  const {
    projectName,
    useVite = true,
    includeCss = true,
  } = options;

  const generator = createTypeScriptReactGenerator(sceneGraph);

  // package.json
  zip.file('package.json', generatePackageJson(projectName, useVite));

  // tsconfig.json
  zip.file('tsconfig.json', generateTsConfig());

  // vite.config.ts (if using Vite)
  if (useVite) {
    zip.file('vite.config.ts', generateViteConfig());
  }

  // index.html
  zip.file('index.html', generateIndexHtml(projectName));

  // Main entry
  zip.file('src/main.tsx', generateMainTsx());

  // App.tsx with imports for all components
  const componentNames: string[] = [];

  // Generate component files
  for (const nodeId of nodeIds) {
    const node = sceneGraph.getNode(nodeId);
    if (!node) continue;

    const result = generator.generate(nodeId, {
      includeComments: true,
      includeTypes: true,
    });

    const fileName = sanitizeFileName(node.name || 'Component');
    componentNames.push(fileName);
    zip.file(`src/components/${fileName}.tsx`, result.code);
  }

  // App.tsx
  zip.file('src/App.tsx', generateAppTsx(componentNames));

  // CSS
  if (includeCss) {
    zip.file('src/index.css', generateIndexCss());
    zip.file('src/App.css', generateAppCss());
  }

  // .gitignore
  zip.file('.gitignore', generateTypeScriptGitignore());

  // README
  zip.file('README.md', generateTypeScriptReadme(projectName));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// =============================================================================
// Android File Generators
// =============================================================================

function generateRootBuildGradle(): string {
  return `// Top-level build file where you can add configuration options common to all sub-projects/modules.
// Generated by DesignLibre

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}
`;
}

function generateSettingsGradle(projectName: string): string {
  return `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${projectName}"
include(":app")
`;
}

function generateGradleProperties(): string {
  return `# Project-wide Gradle settings.
# Generated by DesignLibre

org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`;
}

function generateVersionsCatalog(): string {
  const v = ANDROID_VERSIONS;
  return `[versions]
agp = "${v.agp}"
kotlin = "${v.kotlin}"
coreKtx = "${v.coreKtx}"
junit = "${v.junit}"
junitVersion = "${v.androidxTestExt}"
espressoCore = "${v.espresso}"
appcompat = "${v.appcompat}"
constraintlayout = "${v.constraintLayout}"
composeBom = "${v.composeBom}"
activityCompose = "${v.activityCompose}"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
androidx-constraintlayout = { group = "androidx.constraintlayout", name = "constraintlayout", version.ref = "constraintlayout" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
androidx-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
androidx-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
`;
}

function generateGradleWrapper(): string {
  return `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.10-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
}

function generateAppBuildGradle(applicationId: string, useCompose: boolean): string {
  const v = ANDROID_VERSIONS;
  return `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    ${useCompose ? 'alias(libs.plugins.kotlin.compose)' : ''}
}

android {
    namespace = "${applicationId}"
    compileSdk = ${v.compileSdk}

    defaultConfig {
        applicationId = "${applicationId}"
        minSdk = ${v.minSdk}
        targetSdk = ${v.targetSdk}
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    ${useCompose ? `buildFeatures {
        compose = true
    }` : ''}
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    ${useCompose ? `
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.activity.compose)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
    ` : `
    implementation(libs.androidx.constraintlayout)
    `}

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    ${useCompose ? 'androidTestImplementation(libs.androidx.ui.test.junit4)' : ''}
}
`;
}

function generateAndroidManifest(_packageName: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.DesignLibre">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.DesignLibre">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;
}

function generateMainActivity(packageName: string, useCompose: boolean): string {
  if (useCompose) {
    return `package ${packageName}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import ${packageName}.ui.theme.DesignLibreTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DesignLibreTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    // Add your generated composables here
                }
            }
        }
    }
}
`;
  } else {
    return `package ${packageName}

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}
`;
  }
}

function generateComposeTheme(packageName: string): string {
  return `package ${packageName}.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = Purple80,
    secondary = PurpleGrey80,
    tertiary = Pink80
)

private val LightColorScheme = lightColorScheme(
    primary = Purple40,
    secondary = PurpleGrey40,
    tertiary = Pink40
)

@Composable
fun DesignLibreTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
`;
}

function generateComposeColors(packageName: string): string {
  return `package ${packageName}.ui.theme

import androidx.compose.ui.graphics.Color

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)
`;
}

function generateComposeTypography(packageName: string): string {
  return `package ${packageName}.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Typography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    )
)
`;
}

function generateUnitTest(packageName: string): string {
  return `package ${packageName}

import org.junit.Test
import org.junit.Assert.*

class ExampleUnitTest {
    @Test
    fun addition_isCorrect() {
        assertEquals(4, 2 + 2)
    }
}
`;
}

function generateInstrumentedTest(packageName: string): string {
  return `package ${packageName}

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*

@RunWith(AndroidJUnit4::class)
class ExampleInstrumentedTest {
    @Test
    fun useAppContext() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("${packageName}", appContext.packageName)
    }
}
`;
}

function generateAndroidGitignore(): string {
  return `# Built application files
*.apk
*.aar
*.ap_
*.aab

# Files for the ART/Dalvik VM
*.dex

# Java class files
*.class

# Generated files
bin/
gen/
out/
release/

# Gradle files
.gradle/
build/

# Local configuration file
local.properties

# Android Studio
*.iml
.idea/
.DS_Store

# NDK
obj/
.externalNativeBuild
.cxx/

# IntelliJ
*.ipr
*.iws

# Keystore files
*.jks
*.keystore
`;
}

function generateAndroidReadme(projectName: string): string {
  return `# ${projectName}

Generated by DesignLibre - Android Project

## Requirements

- Android Studio Hedgehog or newer
- JDK 17
- Android SDK ${ANDROID_VERSIONS.compileSdk}

## Getting Started

1. Open this project in Android Studio
2. Sync Gradle files
3. Run on emulator or device

## Dependencies

- Compose BOM: ${ANDROID_VERSIONS.composeBom}
- Kotlin: ${ANDROID_VERSIONS.kotlin}
- Min SDK: ${ANDROID_VERSIONS.minSdk}
- Target SDK: ${ANDROID_VERSIONS.targetSdk}

## Structure

\`\`\`
app/
  src/
    main/
      java/          # Kotlin source files
      res/           # Resources (colors, strings, etc.)
      AndroidManifest.xml
    test/            # Unit tests
    androidTest/     # Instrumented tests
\`\`\`
`;
}

// =============================================================================
// iOS File Generators
// =============================================================================

function generateXcodeProject(_projectName: string, _bundleId: string, _deploymentTarget: string): string {
  // Simplified pbxproj - in reality this would be much more complex
  return `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 56;
  objects = {
    /* This is a simplified project file. Import into Xcode to regenerate. */
  };
  rootObject = "PROJECT_ROOT";
}
`;
}

function generateSwiftApp(projectName: string): string {
  return `import SwiftUI

@main
struct ${sanitizeFileName(projectName)}App: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
`;
}

function generateContentView(projectName: string, nodeIds: NodeId[], sceneGraph: SceneGraph): string {
  const imports: string[] = [];
  for (const nodeId of nodeIds) {
    const node = sceneGraph.getNode(nodeId);
    if (node) {
      imports.push(sanitizeFileName(node.name || 'Component'));
    }
  }

  return `import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
${imports.map(name => `                NavigationLink("${name}") {
                    ${name}View()
                }`).join('\n')}
            }
            .navigationTitle("${projectName}")
        }
    }
}

#Preview {
    ContentView()
}
`;
}

function generateInfoPlist(bundleId: string, projectName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key>
    <string>${bundleId}</string>
    <key>CFBundleName</key>
    <string>${projectName}</string>
    <key>CFBundleDisplayName</key>
    <string>${projectName}</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UILaunchScreen</key>
    <dict/>
</dict>
</plist>
`;
}

function generateIOSGitignore(): string {
  return `# Xcode
build/
*.pbxuser
!default.pbxuser
*.mode1v3
!default.mode1v3
*.mode2v3
!default.mode2v3
*.perspectivev3
!default.perspectivev3
xcuserdata/
*.xccheckout
*.moved-aside
DerivedData/
*.hmap
*.ipa
*.xcuserstate
*.xcscmblueprint

# CocoaPods
Pods/
Podfile.lock

# Swift Package Manager
.build/
.swiftpm/

# Carthage
Carthage/Build/

# macOS
.DS_Store
*.swp
*~
`;
}

function generateIOSReadme(projectName: string): string {
  return `# ${projectName}

Generated by DesignLibre - iOS Project

## Requirements

- Xcode ${IOS_VERSIONS.xcodeVersion} or newer
- iOS ${IOS_VERSIONS.iosDeploymentTarget}+ deployment target
- Swift ${IOS_VERSIONS.swiftVersion}

## Getting Started

1. Open \`${projectName}.xcodeproj\` in Xcode
2. Select your development team in Signing & Capabilities
3. Build and run on simulator or device

## Structure

\`\`\`
${projectName}/
  ${projectName}App.swift    # App entry point
  ContentView.swift          # Main content view
  Assets.xcassets/           # Images and colors
  Preview Content/           # Preview assets
\`\`\`
`;
}

// =============================================================================
// TypeScript File Generators
// =============================================================================

function generatePackageJson(projectName: string, useVite: boolean): string {
  const v = TYPESCRIPT_VERSIONS;
  return JSON.stringify({
    name: projectName.toLowerCase().replace(/\s+/g, '-'),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: useVite ? 'vite' : 'react-scripts start',
      build: useVite ? 'tsc && vite build' : 'react-scripts build',
      preview: useVite ? 'vite preview' : undefined,
      lint: 'eslint . --ext ts,tsx',
    },
    dependencies: {
      react: v.react,
      'react-dom': v.reactDom,
    },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@vitejs/plugin-react': '^4.2.0',
      typescript: v.typescript,
      vite: v.vite,
    },
  }, null, 2);
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  }, null, 2);
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
}

function generateIndexHtml(projectName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function generateMainTsx(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
}

function generateAppTsx(componentNames: string[]): string {
  const imports = componentNames.map(name =>
    `import { ${name} } from './components/${name}'`
  ).join('\n');

  return `${imports}
import './App.css'

function App() {
  return (
    <div className="app">
      <h1>DesignLibre Export</h1>
      <div className="components">
${componentNames.map(name => `        <${name} />`).join('\n')}
      </div>
    </div>
  )
}

export default App
`;
}

function generateIndexCss(): string {
  return `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
`;
}

function generateAppCss(): string {
  return `.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
}

.components {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
}
`;
}

function generateTypeScriptGitignore(): string {
  return `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Dependencies
node_modules
.pnp
.pnp.js

# Build
dist
dist-ssr
*.local

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS
.DS_Store
`;
}

function generateTypeScriptReadme(projectName: string): string {
  return `# ${projectName}

Generated by DesignLibre - TypeScript/React Project

## Requirements

- Node.js 18+
- npm or yarn

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Stack

- React ${TYPESCRIPT_VERSIONS.react}
- TypeScript ${TYPESCRIPT_VERSIONS.typescript}
- Vite ${TYPESCRIPT_VERSIONS.vite}

## Structure

\`\`\`
src/
  components/    # Generated React components
  App.tsx        # Main app component
  main.tsx       # Entry point
  index.css      # Global styles
\`\`\`
`;
}

// =============================================================================
// Utilities
// =============================================================================

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^(\d)/, '_$1') || 'Component';
}

// =============================================================================
// Download Helpers
// =============================================================================

export async function downloadAndroidProject(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: AndroidProjectOptions
): Promise<void> {
  const blob = await exportAndroidProject(sceneGraph, nodeIds, options);
  downloadBlob(blob, `${options.projectName}-android.zip`);
}

export async function downloadIOSProject(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: IOSProjectOptions
): Promise<void> {
  const blob = await exportIOSProject(sceneGraph, nodeIds, options);
  downloadBlob(blob, `${options.projectName}-ios.zip`);
}

export async function downloadTypeScriptProject(
  sceneGraph: SceneGraph,
  nodeIds: NodeId[],
  options: TypeScriptProjectOptions
): Promise<void> {
  const blob = await exportTypeScriptProject(sceneGraph, nodeIds, options);
  downloadBlob(blob, `${options.projectName}-react.zip`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
