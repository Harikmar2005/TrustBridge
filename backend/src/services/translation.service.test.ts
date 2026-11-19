import test from "node:test";
import assert from "node:assert/strict";
import {
  getTranslationProvider,
  isSupportedTranslationLanguage,
  UnsupportedTranslationLanguageError,
} from "./translation.service";

test("recognizes supported and unsupported translation language codes", () => {
  assert.equal(isSupportedTranslationLanguage("en"), true);
  assert.equal(isSupportedTranslationLanguage("TA"), true);
  assert.equal(isSupportedTranslationLanguage("zz"), false);
  assert.equal(isSupportedTranslationLanguage(""), false);
});

test("unconfigured translation provider preserves original content without fabricating output", async () => {
  const provider = getTranslationProvider();
  const result = await provider.translate("Order confirmed for tomorrow.", "es");
  assert.equal(result.configured, false);
  assert.equal(result.provider, "none");
  assert.equal(result.translatedText, null);
  assert.equal(result.machineGenerated, false);
  assert.equal(result.originalText, "Order confirmed for tomorrow.");
});

test("rejects unsupported target languages explicitly", async () => {
  const provider = getTranslationProvider();
  await assert.rejects(
    () => provider.translate("Hello world", "klingon"),
    UnsupportedTranslationLanguageError
  );
});
