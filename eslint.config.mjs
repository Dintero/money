import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config({
    files: ["src/**/*.ts"],
    extends: [
        eslint.configs.recommended,
        ...tseslint.configs.recommended,
        prettier,
    ],
    rules: {
        "@typescript-eslint/consistent-type-imports": ["error"],
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            },
        ],
    },
});
