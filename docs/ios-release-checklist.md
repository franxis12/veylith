# iOS release preparation

This is an engineering checklist, not a declaration that Veylith is approved or ready for submission. Work stays on `Dev`; publishing, Apple account actions and promotion to `main` are separate. Francis owns level review. Another agent owns the public website and policy content.

## Identity and native branding

- Bundle ID: `com.francismartinez.veylith`, aligned in application config and both Xcode configurations. This does not register an App ID with Apple.
- Display name: Veylith. Verify the final version/build and distribution signing in Xcode.
- The native icon and launch image are packaging exports of `public/assets/ui/logo/veylith_logo.png`, not new artwork. Source SHA-256: `9e8f50a810872a074ab36fff9065300622938615e69706b4657691a5d10e5663`.
- The 1024 × 1024 icon is opaque RGB with the original full wordmark centered on the game background `#101b26`. No corners are pre-rounded. A dedicated square mark could improve small-size readability, but has not been invented or extracted by deleting parts of the source art.
- Launch uses the full wordmark at aspect-fit, centered at 65% of screen width on the same background. It does not display a fixed-duration advert or introduce a delayed startup. The image set keeps existing filenames to preserve native references; its exported dimensions now follow 1×/2×/3× logo sizes rather than the old square placeholder sizes.
- Inspect the home-screen icon, launch screen and first web frame on real supported iPhones, in both landscape orientations, before acceptance. XML/image checks do not replace `ibtool`, asset-catalog compilation or device inspection.

## Apple setup and release gates

- [ ] Verify active developer membership, appropriate account role and the App Store Connect app record. None were inspected from this clone.
- [ ] Register/match the App ID and Game Center capability; select the correct signing team. Do not store certificates or private keys in Git.
- [ ] Configure the exact leaderboards and achievements described by the Game Center implementation, including display order, score units, localization, images and review status. Do not assume proposed identifiers already exist in Apple.
- [ ] Build and archive on a Mac using the current Apple-required toolchain. As verified November 1, 2026, uploads require the iOS 26 SDK or later (Xcode 26 or later). This does not require changing the deployment target to iOS 26.
- [ ] Validate the archive, native package resolution, entitlements, signing, App Store icon and privacy report. Linux `cap:sync` does not compile or sign iOS.
- [ ] Complete App Store description, accurate screenshots, age-rating answers, support/privacy URLs, review notes, availability, version/build and export-compliance answers. Do not infer answers solely from use of HTTPS or Game Center.
- [ ] Review shipped asset rights and software notices below.
- [ ] Use TestFlight for practical testing if desired; beta distribution is useful, not a substitute for App Review or a universal submission requirement.

Official references: [SDK requirement](https://developer.apple.com/news/?id=ueeok6yw), [app icon](https://developer.apple.com/help/app-store-connect/manage-app-information/add-an-app-icon/), [App Review guidelines](https://developer.apple.com/app-store/review/guidelines/), [Game Center configuration](https://developer.apple.com/help/app-store-connect/configure-game-center/manage-an-app-version-for-game-center/).

## Website handoff

Francis selected `https://veylith.francismartinez.com`; it was not yet created when this preparation began. Coordinate these proposed routes with the website agent, then verify HTTPS and content on a signed device:

- `https://veylith.francismartinez.com/privacy`: public privacy policy.
- `https://veylith.francismartinez.com/support`: support contact/instructions.

Do not mark these URLs live or complete until verified. The app must offer an accessible privacy link, and App Store Connect needs the corresponding public URL. The web agent should describe actual final behavior, including Game Center, and must not claim cloud synchronization of local progress. No policy text, website publishing or DNS changes were performed in this task.

## Privacy and data inventory

Verify these statements against the final release commit and signed archive, especially after any SDK changes:

| Component                     | Observed handling                                                                                                                | Release review                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game progress/options         | Browser/WKWebView local storage for progress, scores, stars, currency and preferences                                            | Explain local persistence; reinstall/device changes may lose local data. This is not cloud save.                                                                       |
| Game Center                   | Apple-managed player authentication and selected scores/achievements; player identifier/display name used by the app integration | Review final identity handling, per-player persistence and Apple service behavior. Do not blanket-declare no collected data merely because there is no custom backend. |
| Ads/analytics/custom accounts | No such services were added by this preparation                                                                                  | Re-audit if introduced later. Game Center is not an app-owned account system or an SSO substitute.                                                                     |
| Public policy/support links   | Open the chosen website                                                                                                          | The website's hosting, logging/contact handling and policy are a separate workstream.                                                                                  |

The installed Capacitor 8.5.3 and CapacitorCordova sources include `PrivacyInfo.xcprivacy` with tracking disabled and empty collected-data/required-reason API arrays. The checked Capacitor App 8.1.2 source and new GameKit bridge did not reveal use of `UserDefaults`, file timestamp, disk-space or system-boot-time APIs requiring an app reason declaration. This is a source-level check, not complete archive certification. The GameKit bridge has no native persistence or credential logging.

No speculative app privacy manifest or unsupported reason codes were added. Inspect the final SwiftPM-resolved SDKs and Xcode privacy report. Add app-owned required-reason declarations only for actual covered API usage, and keep data disclosures accurate. App Store Connect privacy answers and a website policy remain separate from manifests.

References: [App privacy answers](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/), [privacy manifests](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk), [required-reason APIs](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest).

## Shipped art, audio and software inventory

Asset counts below are a repository snapshot, not proof of a commercial license or the final App Store binary size:

| Source folder | Files | Approximate size |
| ------------- | ----: | ---------------: |
| environments  |   567 |          228 MiB |
| objects       |   655 |          148 MiB |
| characters    |   208 |           72 MiB |
| UI            |   139 |           27 MiB |
| audio         |    75 |          8.5 MiB |
| effects       |    36 |            8 MiB |
| items         |    92 |            6 MiB |
| VFX           |    67 |            3 MiB |

The original image inventories and hashes in `docs/asset-*` help trace files, but do not by themselves establish rights. No per-asset commercial-rights ledger was found. Before release, confirm the source and permitted use for artwork, animations and audio, retaining receipts, generator terms or attribution requirements where relevant. No separate web font file was found; CSS uses the Arial/Helvetica/sans-serif system stack. Do not infer that absence of a root repository LICENSE removes Francis's rights, or that it licenses the artwork to others.

`public/third-party-notices.txt` contains the installed license text for the direct runtime packages plus their currently installed runtime dependencies: Capacitor App/Core/iOS, Phaser, React/React DOM, Zustand, tslib, eventemitter3 and scheduler. It also includes the vendored Matter.js license, the Apache-licensed Cordova compatibility header and Apache 2.0 terms. These notices do not license Veylith assets. Regenerate after dependency changes using:

```sh
node scripts/generate-third-party-notices.js
```

The Apache terms source is the standard `/usr/share/common-licenses/Apache-2.0` copy, preserved at `scripts/vendor-licenses/apache-2.0.txt`; the attribution header is read from the installed CapacitorCordova `CDVPlugin.h`. No standalone Cordova `NOTICE` file was present in the inspected npm package. Review the final SwiftPM-resolved distribution for additional vendor notices and preserve any supplied by that distribution. The generated file is not a substitute for that final archive check.

## Size and performance

The audited web build was approximately 508 MiB; `public/assets` approximately 506 MiB is copied as-is. There are source exports, individual animation frames, preview GIF/WebP files and generation notes alongside runtime files. Preview GIFs alone occupy about 11 MiB. Do not delete originals or exclude paths blindly: some manifests and scenes still reference originals, and byte-preserved audit fixtures must remain valid.

A future release-only asset allowlist can reduce copied files after proving every runtime path, offline load and prototype requirement. This task preserves source assets and does not introduce an unvalidated allowlist. First measure the final iOS archive, install footprint, cold start and GPU memory on a real device; 508 MiB alone is not evidence of rejection.

## Device acceptance matrix

- [ ] Signed installation, launch/return, home-screen icon and landscape launch image on supported iPhone sizes.
- [ ] All ten real victories, retries, negative strategies, pause/resume and save persistence: Francis's level-review workstream; do not update historical hashes without new evidence.
- [ ] Simultaneous touch controls, safe areas, orientation, audio interruptions, background/foreground, force-quit/relaunch and upgrade persistence.
- [ ] Game Center signed out, sign-in/refusal, unavailable network, reconnect, player change, scoreboard/achievement presentation, completed submissions and return to game.
- [ ] Distinct Game Center players never receive another player's queued scores or earned-state claims. Local progress is not silently uploaded as a different player's achievement history.
- [ ] Privacy, support and local third-party-notice links work; external pages match the final implementation and never block offline play.
- [ ] Long-session memory/thermal behavior, loading time and no missing assets in the final bundled build.

The known campaign integrity/evidence failures remain visible and are not repaired as part of native branding or release documentation.
