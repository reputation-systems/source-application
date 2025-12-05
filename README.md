# Source Application

## Overview

This repository describes a **decentralized File Discovery and Verification application** built on the Ergo blockchain, utilizing the **Ergo Reputation System**. The app acts as a decentralized directory that maps **file hashes** (Blake2b256) to **download sources** (URLs, IPFS CIDs, Magnet links).

Resources on the web are dynamic: links rot, servers go down, and files are moved. Therefore, in this application, **objects are unlocked** (`R6=false`). This allows authors to update URLs when they break, and allows users to update their opinions (vote changes) as the quality of a source changes over time.

# Core Concepts

## Boxes and Registers

Every object is an Ergo box that follows the common reputation-proof contract.

* **Token(0)**: `(repTokenId, amount)` — The reputation token protecting this contract.
* **R4**: `Coll[Byte]` -> `typeId` (Identifies the object type).
* **R6**: `Boolean` -> `isLocked` (Always `false` in this app).
* **R7**: `Coll[Byte]` -> `propositionBytes` (Owner).

---

## 1. FILE_SOURCE (The Link)

Represents a specific location (URL) where a file with a specific hash can be found.

* **R4**: `FILE_SOURCE`
* **R5**: `file_hash` (Blake2b256 digest). **This is the anchor.** Users search by this hash.
* **R9**: `source_url` (The download link).
* **R6**: `false` (Unlocked). If the link dies, the owner spends this box and outputs a new one with the *same* R5 (hash) but updated R9 (URL).

## 2. SOURCE_OPINION (Item Verification)

Represents a user's feedback on a **specific version** of a source.

* **R4**: `SOURCE_OPINION`
* **R5**: `target_box_id` (The specific Ergo box ID of the `FILE_SOURCE` being rated).
* **R8**: `Boolean` (Positive/Negative).
* **R6**: `false` (Unlocked). The author can change their mind (e.g., if a file stops working, they can update their opinion from Positive to Negative).

> **Important Logic: The "Bait and Switch" Protection**
> Because `SOURCE_OPINION` points to a specific `box_id`, opinions are **immutable regarding the target**.
>
> * If a Source Owner updates their URL (creating a new box with a new `box_id`), the old opinions **do not** automatically transfer to the new box.
> * **Why?** This prevents a malicious actor from gathering 100 upvotes on a valid file, then swapping the URL (`R9`) to a virus while keeping the reputation.
> * **UI Behavior:** The UI shows opinions attached to the *current* box. If a source is updated, it starts with 0 direct opinions, ensuring the new link must be re-verified by the community.

## 3. PROFILE_OPINION (Trusting the "Opiner")

Since links update frequently and lose their attached opinions, we need a persistent trust mechanism. This object represents trusting a **User/Profile** rather than a specific box.

* **R4**: `PROFILE_OPINION`
* **R5**: `target_profile_token_id` (The Reputation Token ID of the user being trusted).
* **R8**: `Boolean` (Trust/Distrust).
* **R6**: `false` (Unlocked).

> **UI Behavior:** When a trusted user (User A) posts a new `FILE_SOURCE` (or updates an old one), the UI can display: *"Source provided by User A (Trusted by You/Community)"*, even if that specific new box has 0 direct votes yet.

---

# Application Behavior (Off-chain)

## 1. File Discovery (Hash-to-URL)
* **Input:** User provides a SHA-256 / Blake2b256 hash.
* **Query:** Fetch all unlocked boxes where `R4 == FILE_SOURCE` AND `R5 == hash`.
* **Display:** List the URLs found (`R9`).

## 2. Calculating Trust (The Hierarchy)
To determine if a Source URL is safe, the client evaluates two layers:

1.  **Direct Opinions (`SOURCE_OPINION`):**
    * Look for boxes where `R5 == current_source_box_id`.
    * Sum the reputation (Token amount) of Positive vs. Negative `R8` values.
    * *Note:* Old opinions on previous versions of this link (spent boxes) are ignored for safety, or shown as "Historical Reliability".

2.  **Author Reputation (`PROFILE_OPINION`):**
    * Identify the owner of the Source box (via `R7` or their Reputation Token).
    * Check if there are `PROFILE_OPINION` boxes targeting this owner.
    * If the owner is highly trusted, their new/updated links are flagged as "Likely Safe" by default.

## 3. Handling Updates
* **Updating a URL:** The Source owner spends their `FILE_SOURCE` box. A new box is created with a new `box_id`. The old box is dead.
* **Updating an Opinion:**
    * *Scenario:* Alice voted "Positive" on a link. The link stops working.
    * *Action:* Alice spends her `SOURCE_OPINION` box. She creates a new one with the **same** `R5` (target) but `R8 = false` (Negative).
    * *Result:* The score of the link is updated immediately.

---

# Typical UX Flows

1.  **Adding a Source**
    * User inputs Hash and URL.
    * App mints a `FILE_SOURCE` box.
    * Status: "Unverified" (unless User has high Profile Trust).

2.  **Verifying a Source**
    * User B downloads the file. It works.
    * User B mints a `SOURCE_OPINION` box pointing to the Source's `box_id`.
    * Status: "Verified".

3.  **The "Update" Cycle**
    * The URL dies.
    * Source Owner updates the box to a new URL.
    * Status: "Unverified" (Opinions were left on the old box).
    * User B (or an automated bot/script) notices the update, checks the new link, and mints a *new* opinion for the new `box_id`.

4.  **The "Trust" Cycle**
    * User C notices that User B is an excellent moderator who always finds bad links.
    * User C mints a `PROFILE_OPINION` pointing to User B's **Profile Token**.
    * Now, whenever User B votes on a file, User C sees that file highlighted as trusted.

---

# Security & Privacy

* **Sanitization:** Always treat `R9` (URL) as untrusted user input.
* **Orphaned Opinions:** The "feature" that opinions die when a source updates is a critical security control. Do not try to "automatically migrate" votes to updated boxes in the UI, as this enables malware injection attacks.
* **Profile Privacy:** While the `FILE_SOURCE` data is public, users can choose to use different Profile Tokens for different categories of content if they wish to segregate their reputation.
