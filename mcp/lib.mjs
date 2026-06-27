/**
 * Signer + main-box helpers for the Source Application MCP / `.service`.
 *
 * Source Application writes ARE reputation opinions (a FILE_SOURCE is a positive
 * opinion against the FILE_SOURCE Type NFT; an invalidation/unavailability/trust
 * are opinions against their respective Type NFTs). So publishing reuses the
 * reputation library's headless Node entry exactly like
 * `reputation-system/mcp/lib.mjs`: a Signer is built from the environment and
 * passed to `create_profile_with_signer` / `create_opinion_with_signer`.
 */
import { SeedSigner, UnsignedSigner } from 'reputation-system/node';

export const EXPLORER_API = process.env.SOURCE_EXPLORER_API || 'https://api.ergoplatform.com';

/**
 * Build the configured Signer from environment.
 *
 *   SOURCE_SIGNER_MODE=seed      – sign + submit autonomously with a mnemonic.
 *     SOURCE_MNEMONIC   (required)  BIP-39 mnemonic of the publishing wallet.
 *     SOURCE_MNEMONIC_PASSWORD     optional BIP-39 passphrase.
 *     SOURCE_NODE_URI              Ergo node for submission (default :9053).
 *     SOURCE_ADDRESS_INDEX         change-path index (default 0).
 *
 *   SOURCE_SIGNER_MODE=unsigned  – build only; return the unsigned EIP-12 tx for
 *                                  an external wallet to sign. No key in the
 *                                  agent. (default)
 *     SOURCE_ADDRESS    (required)  the P2PK address whose UTXOs fund the tx.
 */
export function makeSigner() {
  const mode = (process.env.SOURCE_SIGNER_MODE || 'unsigned').toLowerCase();
  if (mode === 'seed') {
    const mnemonic = process.env.SOURCE_MNEMONIC;
    if (!mnemonic) throw new Error('SOURCE_SIGNER_MODE=seed requires SOURCE_MNEMONIC.');
    return new SeedSigner({
      mnemonic,
      password: process.env.SOURCE_MNEMONIC_PASSWORD,
      addressIndex: process.env.SOURCE_ADDRESS_INDEX ? Number(process.env.SOURCE_ADDRESS_INDEX) : 0,
      explorerUri: EXPLORER_API,
      nodeUri: process.env.SOURCE_NODE_URI
    });
  }
  if (mode === 'unsigned') {
    const address = process.env.SOURCE_ADDRESS;
    if (!address) throw new Error('SOURCE_SIGNER_MODE=unsigned requires SOURCE_ADDRESS.');
    return new UnsignedSigner({ address, explorerUri: EXPLORER_API });
  }
  throw new Error(`Unknown SOURCE_SIGNER_MODE: ${mode} (expected 'seed' or 'unsigned').`);
}

/** Return the active signer mode (without constructing a signer / requiring keys). */
export function signerMode() {
  return (process.env.SOURCE_SIGNER_MODE || 'unsigned').toLowerCase();
}

/**
 * Fetch a reputation-proof box by id and shape it into the RPBox `main_box` that
 * `create_opinion_with_signer` consumes. R4 (rendered) is its Type NFT id, which
 * the contract requires as a data input. For Source Application writes this is
 * the author's PROFILE box (the box that holds their reputation token).
 */
export async function fetchMainBox(mainBoxId) {
  if (!/^[0-9a-fA-F]{64}$/.test(mainBoxId || '')) {
    throw new Error(`mainBoxId must be a 64-char hex box id (got: ${mainBoxId}).`);
  }
  const res = await fetch(`${EXPLORER_API}/api/v1/boxes/${mainBoxId}`);
  if (!res.ok) throw new Error(`Failed to fetch main box ${mainBoxId}: HTTP ${res.status}`);
  const box = await res.json();

  const reputationTokenId = box?.assets?.[0]?.tokenId;
  if (!reputationTokenId) {
    throw new Error(`Box ${mainBoxId} holds no reputation token; not a valid main box.`);
  }

  return {
    box: {
      boxId: box.boxId,
      value: box.value.toString(),
      assets: (box.assets ?? []).map((a) => ({ tokenId: a.tokenId, amount: a.amount.toString() })),
      ergoTree: box.ergoTree,
      creationHeight: box.creationHeight,
      additionalRegisters: Object.entries(box.additionalRegisters ?? {}).reduce((acc, [k, v]) => {
        acc[k] = v.serializedValue;
        return acc;
      }, {}),
      index: box.index ?? 0,
      transactionId: box.transactionId
    },
    box_id: box.boxId,
    type: { tokenId: box?.additionalRegisters?.R4?.renderedValue || '' },
    token_id: reputationTokenId,
    token_amount: Number(box.assets[0].amount),
    object_pointer: box?.additionalRegisters?.R5?.renderedValue || '',
    is_locked: box?.additionalRegisters?.R6?.renderedValue === 'true',
    polarization: box?.additionalRegisters?.R8?.renderedValue === 'true',
    content: {}
  };
}

/** Normalize a SignerResult into an MCP/REST-friendly payload. */
export function describeResult(result) {
  if (result.kind === 'submitted') {
    return { submitted: true, txId: result.txId };
  }
  return {
    submitted: false,
    unsignedTransaction: result.transaction,
    note: 'Transaction built but not signed. Sign + submit with an external wallet (Nautilus/ErgoPay).'
  };
}
