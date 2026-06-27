/**
 * Source Application write surface — a faithful port of
 * `src/lib/ergo/sourceStore.ts` to the headless Node signer path.
 *
 * The browser store calls the reputation library through the Nautilus `ergo`
 * dApp connector; here every write goes through `create_*_with_signer` from
 * `reputation-system/node` with the env-configured Signer (see lib.mjs). Each
 * write maps to an opinion against the matching Type NFT:
 *
 *   createProfileBox        → create_profile (PROFILE_TYPE_NFT_ID)
 *   addFileSource           → opinion(FILE_SOURCE_TYPE_NFT_ID, R5=fileHash,    R8=true,  R9=sourceEntry)
 *   confirmSource           → addFileSource (a re-publish / confirming opinion)
 *   updateFileSource        → opinion(FILE_SOURCE_TYPE_NFT_ID, ...) — see note below
 *   markInvalidSource       → opinion(INVALID_FILE_SOURCE_TYPE_NFT_ID, R5=sourceBoxId, R8=false)
 *   markUnavailableSource   → opinion(UNAVAILABLE_SOURCE_TYPE_NFT_ID, R5=sourceUrl,    R8=false)
 *   trustProfile            → opinion(PROFILE_OPINION_TYPE_NFT_ID,    R5=profileTokenId, R8=isTrusted)
 *
 * Every opinion spends from the author's PROFILE box, addressed by `mainBoxId`
 * and resolved on-chain via `fetchMainBox`. Results are normalized by
 * `describeResult`: in seed mode a submitted txId; in unsigned mode the unsigned
 * EIP-12 transaction for an external wallet to sign.
 *
 * NOTE on updateFileSource: the original spends the previous FILE_SOURCE box via
 * `update_opinion` (a Nautilus-only flow). The Node entry exposes
 * `create_*_with_signer` but NOT `update_opinion_with_signer`, so here
 * updateFileSource publishes a NEW FILE_SOURCE opinion carrying the new content
 * for the same hash. The previous box is left in place (it can be invalidated
 * separately). This is called out in `.service/README.md` and the tool text.
 */
import {
  create_profile_with_signer,
  create_opinion_with_signer
} from 'reputation-system/node';

import {
  PROFILE_TYPE_NFT_ID,
  PROFILE_TOTAL_SUPPLY,
  FILE_SOURCE_TYPE_NFT_ID,
  INVALID_FILE_SOURCE_TYPE_NFT_ID,
  UNAVAILABLE_SOURCE_TYPE_NFT_ID,
  PROFILE_OPINION_TYPE_NFT_ID,
  serializeSourceEntry
} from './core.mjs';

import { EXPLORER_API, makeSigner, fetchMainBox, describeResult } from './lib.mjs';

/** Mint a new reputation PROFILE box (the author identity that holds rep tokens). */
export async function createProfileBox(content = { name: 'Anon' }) {
  const signer = makeSigner();
  const result = await create_profile_with_signer(
    signer,
    EXPLORER_API,
    PROFILE_TOTAL_SUPPLY,
    PROFILE_TYPE_NFT_ID,
    content,
    0n
  );
  return describeResult(result);
}

/** Add a FILE_SOURCE opinion: R5=fileHash, R8=positive, R9=serialized source entry. */
export async function addFileSource(mainBoxId, fileHash, sourceEntry) {
  const signer = makeSigner();
  const main_box = await fetchMainBox(mainBoxId);
  const result = await create_opinion_with_signer(
    signer,
    EXPLORER_API,
    1,
    FILE_SOURCE_TYPE_NFT_ID,
    fileHash,
    true,
    serializeSourceEntry(sourceEntry),
    false,
    main_box
  );
  return describeResult(result);
}

/** Confirm a source — same on-chain shape as addFileSource (a confirming opinion). */
export async function confirmSource(mainBoxId, fileHash, sourceEntry) {
  return addFileSource(mainBoxId, fileHash, sourceEntry);
}

/**
 * Update a FILE_SOURCE — publishes a fresh FILE_SOURCE opinion with new content
 * for the same hash (Node signer surface has no `update_opinion_with_signer`).
 */
export async function updateFileSource(mainBoxId, fileHash, sourceEntry) {
  return addFileSource(mainBoxId, fileHash, sourceEntry);
}

/** Mark a FILE_SOURCE box as invalid: opinion against INVALID_FILE_SOURCE_TYPE_NFT_ID, R5=sourceBoxId. */
export async function markInvalidSource(mainBoxId, sourceBoxId) {
  const signer = makeSigner();
  const main_box = await fetchMainBox(mainBoxId);
  const result = await create_opinion_with_signer(
    signer,
    EXPLORER_API,
    1,
    INVALID_FILE_SOURCE_TYPE_NFT_ID,
    sourceBoxId,
    false,
    null,
    false,
    main_box
  );
  return describeResult(result);
}

/** Mark a URL unavailable: opinion against UNAVAILABLE_SOURCE_TYPE_NFT_ID, R5=sourceUrl. */
export async function markUnavailableSource(mainBoxId, sourceUrl) {
  const signer = makeSigner();
  const main_box = await fetchMainBox(mainBoxId);
  const result = await create_opinion_with_signer(
    signer,
    EXPLORER_API,
    1,
    UNAVAILABLE_SOURCE_TYPE_NFT_ID,
    sourceUrl,
    false,
    null,
    false,
    main_box
  );
  return describeResult(result);
}

/** Trust / distrust a profile: opinion against PROFILE_OPINION_TYPE_NFT_ID, R5=profileTokenId, R8=isTrusted. */
export async function trustProfile(mainBoxId, profileTokenId, isTrusted) {
  const signer = makeSigner();
  const main_box = await fetchMainBox(mainBoxId);
  const result = await create_opinion_with_signer(
    signer,
    EXPLORER_API,
    1,
    PROFILE_OPINION_TYPE_NFT_ID,
    profileTokenId,
    Boolean(isTrusted),
    null,
    false,
    main_box
  );
  return describeResult(result);
}
