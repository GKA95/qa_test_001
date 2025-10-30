"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const VALIDATION_URL = "https://schoolbaseapp.com/validate-name";
const USERS_PATH = node_path_1.default.resolve(__dirname, "../data/users.json");
const app = (0, express_1.default)();
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.get("/api/validate-users", (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield loadUsers();
        const results = [];
        for (const name of users) {
            const result = yield validateUser(name);
            results.push(result);
        }
        res.json({ validated: results.length, results });
    }
    catch (error) {
        next(error);
    }
}));
app.use((error, _req, res, _next) => {
    if (res.headersSent)
        return;
    const message = error instanceof Error
        ? error.message
        : "Unexpected error while validating user names.";
    res.status(500).json({ error: message });
});
const port = Number((_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000);
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
function loadUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const raw = yield node_fs_1.promises.readFile(USERS_PATH, "utf8");
        return JSON.parse(raw);
    });
}
function cleanName(name) {
    let cleaned = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    cleaned = cleaned.replace(/[‘’]/g, "'");
    return cleaned.trim();
}
function validateUser(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const clean = cleanName(name);
        const url = `${VALIDATION_URL}?name=${encodeURIComponent(clean)}`;
        if (clean !== name)
            console.log(`Normalized "${name}" → "${clean}"`);
        try {
            const response = yield fetch(url);
            const payload = (yield response.json());
            const message = payload?.message || `Received status ${response.status}`;
            return { name, valid: response.status === 200, message };
        }
        catch (_error) {
            console.error(`${name} - Service unreachable.`);
            return { name, valid: false, message: "Service unreachable" };
        }
    });
}

