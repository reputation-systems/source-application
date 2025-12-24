# Source Application Library

A decentralized File Discovery and Verification library built on Ergo blockchain. This library provides both Svelte components and TypeScript functions for building file source applications with reputation-based trust mechanisms.

## Installation

```bash
npm install source-application
```

## Features

- **Decentralized File Discovery**: Find and share download sources for files by hash
- **Reputation System**: Trust-based verification using Ergo blockchain reputation proofs
- **Opinion Mechanisms**: Confirm, invalidate, or mark sources as unavailable
- **Profile Management**: Create and manage user reputation profiles
- **Island Components**: Three ready-to-use Svelte components that work standalone
- **TypeScript SDK**: Full API for custom integrations

---

## Svelte Components

### ProfileCard

Profile creation and basic information display.

**Props:**
- `profile?: any` - Profile object (optional, uses store if not provided)
- `onProfileCreated?: (txId: string) => void` - Callback when profile is created

**Usage:**
```svelte
<script>
  import { ProfileCard } from 'source-application';
  
  let profile = null;
</script>

<ProfileCard 
  {profile}
  onProfileCreated={(tx) => console.log('Profile created:', tx)}
/>
```

**Features:**
- Shows profile token ID, owner address, and reputation amount
- One-click profile creation if none exists
- Copy to clipboard functionality
- Works as standalone island component

---

### FileSourceCreation

Form for adding new file sources to the network.

**Props:**
- `hasProfile: boolean` - Whether user has a profile (required)
- `onSourceAdded?: (txId: string) => void` - Callback when source is added

**Usage:**
```svelte
<script>
  import { FileSourceCreation } from 'source-application';
  
  let hasProfile = true;
</script>

<FileSourceCreation 
  {hasProfile}
  onSourceAdded={(tx) => console.log('Source added:', tx)}
/>
```

**Features:**
- File hash input (Blake2b256)
- Source URL input (HTTP, IPFS, magnet links)
- Security warnings
- Error handling
- Disabled state when no profile

---

### FileSourceCard

Complete file source display for a specific file hash, including tabs for sources, profile views, and timeline.

**Props:**
- `fileHash: string` - The Blake2b256 hash of the file to display (required)
- `profile?: ReputationProof | null` - The current user's profile (optional, for enabling actions)
- `class?: string` - CSS class for the container (optional)

**Usage:**
```svelte
<script>
  import { FileSourceCard } from 'source-application';
  
  let fileHash = "abc123...";
  let profile = null; // Load from fetchProfile
</script>

<FileSourceCard 
  {fileHash}
  {profile}
/>
```

**Features:**
- Automatically fetches and displays sources for the given hash
- Tabs: By Source, By Profile, Timeline
- Aggregated statistics (Total Sources, etc.)
- Full interaction support (Confirm, Invalidate, Unavailable)
- Responsive design

---

## TypeScript SDK

### Profile Functions

#### fetchProfile
Fetch user's reputation profile from the blockchain.

```typescript
import { fetchProfile } from 'source-application';

const profile = await fetchProfile(ergo);
// Returns: ReputationProof | null
```

#### createProfileBox
Create a new reputation profile for the user.

```typescript
import { createProfileBox } from 'source-application';

const txId = await createProfileBox();
// Returns: string (transaction ID)
```

---

### Source Fetch Functions

#### fetchFileSourcesByHash
Fetch all FILE_SOURCE boxes for a specific file hash.

```typescript
import { fetchFileSourcesByHash } from 'source-application';

const sources = await fetchFileSourcesByHash("abc123...");
// Returns: FileSource[]
```

#### fetchFileSourcesByProfile
Fetch all file sources created by a specific profile.

```typescript
import { fetchFileSourcesByProfile } from 'source-application';

const sources = await fetchFileSourcesByProfile(profileTokenId, 50);
// Returns: FileSource[]
```

#### Other Fetch Functions
- `fetchInvalidFileSources(sourceBoxId)` - Get invalidations for a source
- `fetchUnavailableSources(sourceUrl)` - Get unavailability reports for a URL
- `fetchProfileOpinions(profileTokenId)` - Get trust/distrust opinions for a profile
- `fetchInvalidFileSourcesByProfile(profileTokenId)` - Get invalidations by profile
- `fetchUnavailableSourcesByProfile(profileTokenId)` - Get unavailabilities by profile
- `fetchProfileOpinionsByAuthor(authorTokenId)` - Get opinions given by a profile
- `getTimestampFromBlockId(blockId)` - Get timestamp from block ID

---

### Source Store Functions (Actions)

#### addFileSource
Add a new file source to the network.

```typescript
import { addFileSource } from 'source-application';

const txId = await addFileSource(
  "abc123...", // file hash
  "https://example.com/file.zip" // source URL
);
```

#### confirmSource
Confirm an existing file source (create duplicate FILE_SOURCE).

```typescript
import { confirmSource } from 'source-application';

const txId = await confirmSource(
  "abc123...", // file hash
  "https://example.com/file.zip" // source URL
);
```

#### markInvalidSource
Mark a file source as fake or incorrect.

```typescript
import { markInvalidSource } from 'source-application';

const txId = await markInvalidSource(sourceBoxId);
```

#### markUnavailableSource
Mark a source URL as no longer available.

```typescript
import { markUnavailableSource } from 'source-application';

const txId = await markUnavailableSource("https://example.com/file.zip");
```

#### updateFileSource
Update an existing file source with a new URL.

```typescript
import { updateFileSource } from 'source-application';

const txId = await updateFileSource(
  oldBoxId,
  fileHash,
  newSourceUrl
);
```

#### trustProfile
Express trust or distrust for a profile.

```typescript
import { trustProfile } from 'source-application';

const txId = await trustProfile(profileTokenId, true); // true = trust, false = distrust
```

---

### Store Actions (Loading Data)

#### searchByHash
Load file sources into store by hash.

```typescript
import { searchByHash } from 'source-application';

await searchByHash("abc123...");
// Updates fileSources, invalidFileSources, unavailableSources stores
```

#### loadAllSources
Load recent file sources into store.

```typescript
import { loadAllSources } from 'source-application';

await loadAllSources();
// Updates fileSources store
```

#### loadSourcesByProfile  [not implemented]
Load all sources and opinions for a profile.

```typescript
import { loadSourcesByProfile } from 'source-application';

await loadSourcesByProfile(profileTokenId);
// Updates fileSources, profileInvalidations, profileUnavailabilities stores
```

#### loadProfileOpinions  [not implemented]
Load trust/distrust opinions for a profile.

```typescript
import { loadProfileOpinions } from 'source-application';

await loadProfileOpinions(profileTokenId);
// Updates profileOpinions store
```

---

### Helper Functions

#### groupByDownloadSource
Group file sources by their download URL.

```typescript
import { groupByDownloadSource } from 'source-application';

const groups = groupByDownloadSource(
  sources,
  invalidationsMap,
  unavailabilitiesMap
);
// Returns: DownloadSourceGroup[]
```

#### groupByProfile
Group file sources by the profile that submitted them.

```typescript
import { groupByProfile } from 'source-application';

const groups = groupByProfile(sources);
// Returns: ProfileSourceGroup[]
```

#### calculateProfileTrust
Calculate trust score for a profile based on opinions.

```typescript
import { calculateProfileTrust } from 'source-application';

const trustScore = calculateProfileTrust(profileTokenId, opinions);
// Returns: number
```

#### aggregateSourceScore
Aggregate all opinion data for a file source.

```typescript
import { aggregateSourceScore } from 'source-application';

const scoreData = aggregateSourceScore(
  source,
  allSources,
  invalidations,
  unavailabilities,
  profileOpinions
);
// Returns: FileSourceWithScore
```

---

## TypeScript Types

### Core Interfaces

```typescript
import type {
  FileSource,
  InvalidFileSource,
  UnavailableSource,
  ProfileOpinion,
  ReputationProof,
  RPBox
} from 'source-application';
```

**FileSource**
```typescript
interface FileSource {
  id: string;              // Box ID
  fileHash: string;        // Blake2b256 hash
  sourceUrl: string;       // Download URL
  ownerTokenId: string;    // Profile token ID
  reputationAmount: number;
  timestamp: number;
  isLocked: boolean;
  transactionId: string;
}
```

**InvalidFileSource**
```typescript
interface InvalidFileSource {
  id: string;
  targetBoxId: string;     // Box being invalidated
  authorTokenId: string;
  reputationAmount: number;
  timestamp: number;
  transactionId: string;
}
```

**UnavailableSource**
```typescript
interface UnavailableSource {
  id: string;
  sourceUrl: string;       // URL being marked unavailable
  authorTokenId: string;
  reputationAmount: number;
  timestamp: number;
  transactionId: string;
}
```

**ProfileOpinion**
```typescript
interface ProfileOpinion {
  id: string;
  targetProfileTokenId: string;
  isTrusted: boolean;      // true = trust, false = distrust
  authorTokenId: string;
  reputationAmount: number;
  timestamp: number;
  transactionId: string;
}
```

---

## Svelte Stores

All stores are reactive and can be subscribed to in Svelte applications.

```typescript
import {
  reputation_proof,       // Current user's profile
  fileSources,           // Cached file sources
  currentSearchHash,     // Currently searched hash
  invalidFileSources,    // Cached invalidations
  unavailableSources,    // Cached unavailabilities
  profileOpinions,       // Cached profile opinions
  isLoading,             // Loading state
  error                  // Error messages
} from 'source-application';

// Usage in Svelte
$: profile = $reputation_proof;
$: sources = $fileSources;
```

---

## Environment Constants

```typescript
import {
  PROFILE_TYPE_NFT_ID,
  FILE_SOURCE_TYPE_NFT_ID,
  INVALID_FILE_SOURCE_TYPE_NFT_ID,
  UNAVAILABLE_SOURCE_TYPE_NFT_ID,
  PROFILE_OPINION_TYPE_NFT_ID,
  PROFILE_TOTAL_SUPPLY,
  explorer_uri,              // Writable store
  web_explorer_uri_tx,       // Writable store
  web_explorer_uri_addr,     // Writable store
  web_explorer_uri_tkn       // Writable store
} from 'source-application';

// Customize explorer URIs
explorer_uri.set('https://api.ergoplatform.com');
```

---

## Complete Example

```svelte
<script>
  import {
    ProfileCard,
    FileSourceCreation,
    FileSourceCard,
    fetchProfile,
    reputation_proof
  } from 'source-application';
  
  let ergo; // Wallet connector
  let fileHash = "";
  
  // Load profile
  async function loadProfile() {
    if (ergo) {
      await fetchProfile(ergo);
    }
  }
  
  $: profile = $reputation_proof;
</script>

<!-- Profile Management -->
<ProfileCard {profile} />

<!-- Add New Source -->
{#if profile}
  <FileSourceCreation hasProfile={true} />
{/if}

<!-- Search & Display Results -->
<div class="my-4">
  <input bind:value={fileHash} placeholder="Enter file hash" />
</div>

{#if fileHash}
  <FileSourceCard
    {fileHash}
    {profile}
  />
{/if}
```

---

## Notes

- All blockchain interactions require an Ergo wallet connection
- Functions return transaction IDs that can be tracked on the blockchain
- Stores use caching with configurable duration (default: 5 minutes)
- Components are self-contained and work as standalone islands
- All URLs are sanitized for security

## License

MIT
