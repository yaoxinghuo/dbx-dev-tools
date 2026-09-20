// RSA keypair generation via WebCrypto, exported as PEM.
// Public key -> SPKI ("BEGIN PUBLIC KEY"), private key -> PKCS#8
// ("BEGIN PRIVATE KEY"). PKCS#1 ("BEGIN RSA PRIVATE KEY") isn't exported
// by WebCrypto; PKCS#8 is accepted by every modern consumer.

export const RSA_ALGS = {
  "RSASSA-PKCS1-v1_5": { hash: "SHA-256", usages: ["sign", "verify"], kind: "sign" },
  "RSA-PSS": { hash: "SHA-256", usages: ["sign", "verify"], kind: "sign" },
  "RSA-OAEP": { hash: "SHA-256", usages: ["encrypt", "decrypt"], kind: "encrypt" },
};

function pem(label, der) {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  const lines = b64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

// -> { publicPem, privatePem }
export async function generateRsaPair(alg, modulusLength) {
  const spec = RSA_ALGS[alg];
  if (!spec) throw new Error(`unknown RSA algorithm: ${alg}`);
  const pair = await crypto.subtle.generateKey(
    { name: alg, modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: spec.hash },
    true,
    spec.usages,
  );
  const [spki, pkcs8] = await Promise.all([
    crypto.subtle.exportKey("spki", pair.publicKey),
    crypto.subtle.exportKey("pkcs8", pair.privateKey),
  ]);
  return { publicPem: pem("PUBLIC KEY", spki), privatePem: pem("PRIVATE KEY", pkcs8) };
}
