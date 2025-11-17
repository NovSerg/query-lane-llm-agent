# MCP Integration (Model Context Protocol)

QueryLane поддерживает подключение к MCP серверам для расширения возможностей AI-агентов через стандартизированные инструменты.

## Что такое MCP?

**Model Context Protocol (MCP)** - это открытый протокол от Anthropic, который позволяет AI-моделям взаимодействовать с внешними системами и инструментами через стандартизированный интерфейс.

## Текущая интеграция: Figma MCP

В проект интегрирован **Figma MCP сервер** (`figma-developer-mcp`), который предоставляет доступ к Figma API.

### Доступные инструменты

#### 1. `get_figma_data`
Получение данных из Figma файла (layout, контент, визуальные элементы, компоненты).

**Параметры:**
- `fileKey` (обязательный) - ключ Figma файла из URL
- `nodeId` (опционально) - ID конкретного узла
- `depth` (опционально) - глубина обхода дерева узлов

**Пример:**
```typescript
const data = await client.callTool('get_figma_data', {
  fileKey: 'abc123xyz',
  nodeId: '1234:5678'
});
```

#### 2. `download_figma_images`
Скачивание SVG и PNG изображений из Figma файла.

**Параметры:**
- `fileKey` (обязательный) - ключ Figma файла
- `nodes` (обязательный) - массив узлов для скачивания
- `localPath` (обязательный) - путь для сохранения
- `pngScale` (опционально) - масштаб для PNG (по умолчанию 2)

**Пример:**
```typescript
await client.callTool('download_figma_images', {
  fileKey: 'abc123xyz',
  nodes: [
    {
      nodeId: '1234:5678',
      fileName: 'icon.svg'
    }
  ],
  localPath: 'D:/project/assets'
});
```

## Установка и настройка

### 1. Установка зависимостей

Уже установлено в проекте:
```bash
npm install @modelcontextprotocol/sdk figma-developer-mcp dotenv
```

### 2. Настройка Figma API токена

Получите токен:
1. Перейдите на https://www.figma.com/developers/api#access-tokens
2. Создайте новый Personal Access Token
3. Скопируйте токен

Добавьте в `.env`:
```env
FIGMA_API_KEY=your_figma_api_key_here
```

### 3. Запуск тестового скрипта

```bash
# С токеном из .env
npx tsx scripts/test-mcp.ts

# Или напрямую через переменную окружения
FIGMA_API_KEY=your_token npx tsx scripts/test-mcp.ts
```

## Использование в коде

### Базовое подключение

```typescript
import { createFigmaMcpClient } from '@/server/mcp/figma-client';

// Создать клиент (токен берется из .env)
const client = await createFigmaMcpClient();

// Или с явным токеном
const client = await createFigmaMcpClient('your_figma_token');

// Получить список инструментов
const tools = await client.listTools();
console.log(tools);

// Вызвать инструмент
const result = await client.callTool('get_figma_data', {
  fileKey: 'abc123xyz'
});

// Отключиться
await client.disconnect();
```

### Продвинутое использование

```typescript
import { FigmaMcpClient } from '@/server/mcp/figma-client';

const client = new FigmaMcpClient();

try {
  // Подключиться
  await client.connect();

  // Проверить подключение
  if (client.isConnected()) {
    // Получить информацию о сервере
    const info = await client.getServerInfo();
    console.log(`Server: ${info.name} v${info.version}`);

    // Работа с инструментами
    const tools = await client.listTools();

    // Вызвать инструмент
    const data = await client.callTool('get_figma_data', {
      fileKey: 'your_file_key',
      nodeId: '1:2'
    });
  }
} finally {
  // Всегда отключаться
  await client.disconnect();
}
```

## Архитектура

```
┌─────────────────┐
│  QueryLane App  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ FigmaMcpClient  │ (server/mcp/figma-client.ts)
└────────┬────────┘
         │ StdioClientTransport
         ▼
┌─────────────────┐
│ Figma MCP Server│ (node_modules/figma-developer-mcp)
└────────┬────────┘
         │ Figma REST API
         ▼
┌─────────────────┐
│   Figma API     │
└─────────────────┘
```

### Компоненты

1. **FigmaMcpClient** - TypeScript клиент для подключения к Figma MCP серверу
2. **StdioClientTransport** - транспорт для общения через stdin/stdout
3. **Figma MCP Server** - локально установленный сервер (`figma-developer-mcp`)
4. **Figma API** - официальное REST API Figma

## Файлы

- `server/mcp/figma-client.ts` - MCP клиент
- `scripts/test-mcp.ts` - тестовый скрипт
- `.env` - переменные окружения (токен)

## Расширение

Чтобы добавить другие MCP серверы:

1. Установите сервер: `npm install <mcp-server-package>`
2. Создайте клиент по аналогии с `figma-client.ts`
3. Используйте `StdioClientTransport` для подключения
4. Получите список инструментов через `client.listTools()`

### Примеры других MCP серверов

- `@modelcontextprotocol/server-filesystem` - работа с файловой системой
- `@modelcontextprotocol/server-fetch` - HTTP запросы
- `@modelcontextprotocol/server-github` - GitHub API
- Другие серверы на https://github.com/modelcontextprotocol

## Безопасность

- ⚠️ Никогда не коммитьте `.env` файл с токенами
- ⚠️ Храните `FIGMA_API_KEY` в `.env.local` (не в `.env`)
- ⚠️ Используйте минимальные права для токенов
- ⚠️ Регулярно ротируйте токены

## Troubleshooting

### Ошибка "FIGMA_API_KEY is required"
- Убедитесь, что токен добавлен в `.env`
- Проверьте, что `.env` файл загружается (`dotenv/config`)

### Ошибка "Connection closed"
- Проверьте, что сервер установлен: `npm list figma-developer-mcp`
- Убедитесь, что используется `--stdio` режим

### Порт 3333 занят
- Убедитесь, что в `figma-client.ts` передается `--stdio` аргумент
- Проверьте `NODE_ENV=cli` в переменных окружения

## Дополнительная информация

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Figma MCP Server](https://github.com/GLips/Figma-Context-MCP)
- [MCP SDK Documentation](https://github.com/anthropics/modelcontextprotocol)
