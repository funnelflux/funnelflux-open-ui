# Funnel API Guide

This guide explains how to create and manage funnels programmatically via the FunnelFlux V2 API. It covers the full lifecycle: creating funnels with nodes and connections, updating them, and making incremental changes.

## Base URL

All endpoints are relative to your FunnelFlux installation:

```
https://your-domain.com/admin/api/v2
```

Authentication is via the `apiKey` query parameter on every request.

## Key Concepts

### IDs Are Caller-Generated

All entity IDs (`idFunnel`, `idNode`, `idConnection`) are **unsigned 64-bit integers that you must generate yourself**. The server does not auto-generate them. Use any unique ID generation strategy (e.g. timestamp-based, snowflake, random) as long as the values are positive integers that fit in 64 bits.

IDs are sent and received as **strings** in JSON (to avoid JavaScript precision issues with large integers).

### Funnels, Nodes, and Connections

A funnel is a directed graph:

- **Funnel** -- the container, belonging to a campaign
- **Nodes** -- the vertices (entry points, pages, offers, rotators, etc.)
- **Connections** -- the edges between nodes, with type-specific routing parameters

### Two Ways to Manage Nodes/Connections

1. **Atomic (recommended for creation)** -- send nodes and connections inline within the funnel save request. Everything is saved in a single transaction.
2. **Incremental** -- use the dedicated node and connection endpoints to add, update, or remove individual elements without replacing the entire funnel.

---

## Creating a Funnel

### Endpoint

```
POST /data/campaign/funnel/save/index.php?apiKey={key}
Content-Type: application/json
```

### Request Body

```json
{
  "idFunnel": "8001000000000001",
  "idCampaign": "7001000000000001",
  "funnelName": "My Funnel",
  "canvasWidth": 1000,
  "canvasHeight": 800,
  "defaultCostPerEntrance": "0.05",
  "isArchived": false,
  "acculumatedUrlParams": [],
  "customTokens": [],
  "incomingTrafficCostOverrides": [],
  "postbackOverrides": [],
  "nodes": [ ... ],
  "connections": [ ... ]
}
```

### Funnel Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idFunnel` | string (uint64) | Yes | Your generated unique ID |
| `idCampaign` | string (uint64) | Yes | ID of the parent campaign (must already exist) |
| `funnelName` | string | Yes | Display name (max 255 chars) |
| `canvasWidth` | integer | Yes | Visual canvas width in pixels |
| `canvasHeight` | integer | Yes | Visual canvas height in pixels |
| `defaultCostPerEntrance` | string | No | Default cost value or cost token |
| `isArchived` | boolean | No | Defaults to `false` |
| `acculumatedUrlParams` | array | No | Query params appended to tracking URLs |
| `customTokens` | array | No | Custom tokens for conditions/code nodes |
| `incomingTrafficCostOverrides` | array | No | Per-traffic-source cost overrides |
| `postbackOverrides` | array | No | Per-traffic-source postback overrides |
| `nodes` | array | No | Array of node objects (see below) |
| `connections` | array | No | Array of connection objects (see below) |

### Key-Value Pair Format

`acculumatedUrlParams`, `customTokens`, and `incomingTrafficCostOverrides` all use the same format:

```json
[
  { "key": "param_name", "value": "param_value" },
  { "key": "another_param", "value": "another_value" }
]
```

For `incomingTrafficCostOverrides`, `key` is the traffic source ID and `value` is the cost override.

### Postback Override Format

```json
[
  {
    "idTrafficSource": "9001000000000001",
    "postbackType": "postbackUrl",
    "postbackCode": "https://example.com/postback?click_id={clickid}"
  }
]
```

`postbackType` must be one of: `none`, `postbackUrl`, `pixelUrl`, `javascript`.

---

## Node Types and Parameters

Every node requires these base fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idNode` | string (uint64) | Yes | Your generated unique ID |
| `idFunnel` | string (uint64) | Yes | Must match the parent funnel ID |
| `nodeName` | string | Yes | Display name |
| `nodeType` | string (enum) | Yes | One of the types listed below |
| `posX` | number (0.0-1.0) | No | Horizontal position on canvas (percentage) |
| `posY` | number (0.0-1.0) | No | Vertical position on canvas (percentage) |
| `isArchived` | boolean | No | Defaults to `false` |

Each `nodeType` requires a specific params object:

### `root` -- Entry Point

The starting node of a funnel. Every funnel needs one.

```json
{
  "idNode": "1000000000000001",
  "idFunnel": "8001000000000001",
  "nodeName": "Entry",
  "nodeType": "root",
  "nodeRotatorParams": {
    "rotatorType": "random"
  },
  "posX": 0.5,
  "posY": 0.05
}
```

`nodeRotatorParams` is optional for root nodes. `rotatorType` can be `"random"` (default) or `"session"`.

### `rotator` -- Traffic Splitter

Distributes traffic across multiple downstream nodes by weight.

```json
{
  "idNode": "1000000000000002",
  "idFunnel": "8001000000000001",
  "nodeName": "50/50 Split",
  "nodeType": "rotator",
  "nodeRotatorParams": {
    "rotatorType": "random"
  },
  "posX": 0.5,
  "posY": 0.2
}
```

### `lander` -- Landing Page

References a page entity of type "lander" that must already exist in the system.

```json
{
  "idNode": "1000000000000003",
  "idFunnel": "8001000000000001",
  "nodeName": "Landing Page A",
  "nodeType": "lander",
  "nodePageParams": {
    "idPage": "6000000000000001",
    "accumulateUrlParams": false,
    "additionalTokens": []
  },
  "posX": 0.3,
  "posY": 0.4
}
```

| Param | Type | Description |
|-------|------|-------------|
| `idPage` | string (uint64) | ID of an existing page (must be type "lander") |
| `accumulateUrlParams` | boolean | Whether to append the funnel's accumulated URL params |
| `additionalTokens` | array of key-value pairs | Extra dynamic tokens to pass (key = query param name, value = a valid system token) |

### `offer` -- Offer Page

Same structure as `lander`, but references a page of type "offer".

```json
{
  "idNode": "1000000000000004",
  "idFunnel": "8001000000000001",
  "nodeName": "Offer",
  "nodeType": "offer",
  "nodePageParams": {
    "idPage": "6000000000000002",
    "accumulateUrlParams": false,
    "additionalTokens": []
  },
  "posX": 0.3,
  "posY": 0.6
}
```

### `externalUrl` -- External Redirect

Redirects to an arbitrary URL.

```json
{
  "idNode": "1000000000000005",
  "idFunnel": "8001000000000001",
  "nodeName": "Partner Site",
  "nodeType": "externalUrl",
  "nodeExternalUrlParams": {
    "url": "https://example.com/landing?ref=funnel"
  },
  "posX": 0.7,
  "posY": 0.4
}
```

### `jsCode` / `phpCode` -- Code Executor

References a code snippet entity that must already exist.

```json
{
  "idNode": "1000000000000006",
  "idFunnel": "8001000000000001",
  "nodeName": "Tracking Pixel",
  "nodeType": "jsCode",
  "nodeCodeParams": {
    "idCode": "5000000000000001"
  },
  "posX": 0.5,
  "posY": 0.5
}
```

The `nodeType` must match the code snippet's type -- `jsCode` for JavaScript snippets, `phpCode` for PHP snippets.

### `condition` -- Conditional Router

References a condition entity that must already exist.

```json
{
  "idNode": "1000000000000007",
  "idFunnel": "8001000000000001",
  "nodeName": "Is Mobile?",
  "nodeType": "condition",
  "nodeConditionParams": {
    "idCondition": "4000000000000001"
  },
  "posX": 0.5,
  "posY": 0.3
}
```

### `visitorTag` -- Tag Visitors

Applies tags to visitors passing through this node.

```json
{
  "idNode": "1000000000000008",
  "idFunnel": "8001000000000001",
  "nodeName": "Tag as Buyer",
  "nodeType": "visitorTag",
  "nodeVisitorTagParams": {
    "tags": ["buyer", "completed-checkout"]
  },
  "posX": 0.5,
  "posY": 0.8
}
```

---

## Connection Types and Parameters

Connections are directional edges from a source node to a target node. Every connection requires:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idConnection` | string (uint64) | Yes | Your generated unique ID |
| `idFunnel` | string (uint64) | Yes | Must match the parent funnel ID |
| `idSourceNode` | string (uint64) | Yes | The node this connection originates from |
| `idTargetNode` | string (uint64) | Yes | The node this connection points to |
| `labelLocation` | number (0.0-1.0) | No | Position of the label along the connection line (default `0.5`) |

The **source node's type** determines which connection params object is required:

### From `root` or `rotator` nodes

Use `connectionRotatorParams`. The `weight` is a decimal between 0.0 and 1.0 representing the proportion of traffic to send down this path.

```json
{
  "idConnection": "2000000000000001",
  "idFunnel": "8001000000000001",
  "idSourceNode": "1000000000000001",
  "idTargetNode": "1000000000000003",
  "connectionRotatorParams": {
    "weight": 0.5
  }
}
```

Weights across all connections from the same rotator/root node should sum to 1.0 (100%).

### From `lander` or `offer` nodes

Use `connectionPageParams`. Pages support up to 64 action outputs.

```json
{
  "idConnection": "2000000000000002",
  "idFunnel": "8001000000000001",
  "idSourceNode": "1000000000000003",
  "idTargetNode": "1000000000000004",
  "connectionPageParams": {
    "onActionNumber": 1,
    "isConversion": false
  }
}
```

| Param | Type | Description |
|-------|------|-------------|
| `onActionNumber` | integer (1-64) | Which action triggers this connection |
| `isConversion` | boolean | Whether this action counts as a conversion. **Only valid when the source node is an `offer`**. |

### From `jsCode` or `phpCode` nodes

Use `connectionCodeParams`. Code nodes support up to 64 "done" outputs.

```json
{
  "idConnection": "2000000000000003",
  "idFunnel": "8001000000000001",
  "idSourceNode": "1000000000000006",
  "idTargetNode": "1000000000000004",
  "connectionCodeParams": {
    "onDoneNumber": 1
  }
}
```

### From `condition` nodes

Use `connectionConditionParams`. Each condition node should have exactly two outgoing connections -- one for `ifYes` and one for `ifNo`.

```json
{
  "idConnection": "2000000000000004",
  "idFunnel": "8001000000000001",
  "idSourceNode": "1000000000000007",
  "idTargetNode": "1000000000000003",
  "connectionConditionParams": {
    "condition": "ifYes"
  }
}
```

`condition` must be either `"ifYes"` or `"ifNo"`.

---

## Complete Example: Creating a Simple Funnel

This creates a funnel with: Entry -> 50/50 split -> two landers -> one offer.

```json
POST /data/campaign/funnel/save/index.php?apiKey=YOUR_API_KEY
Content-Type: application/json

{
  "idFunnel": "8001000000000001",
  "idCampaign": "7001000000000001",
  "funnelName": "Simple Split Test",
  "canvasWidth": 1000,
  "canvasHeight": 800,
  "nodes": [
    {
      "idNode": "1000000000000001",
      "idFunnel": "8001000000000001",
      "nodeName": "Entry",
      "nodeType": "root",
      "posX": 0.5,
      "posY": 0.05
    },
    {
      "idNode": "1000000000000002",
      "idFunnel": "8001000000000001",
      "nodeName": "Lander A",
      "nodeType": "lander",
      "nodePageParams": {
        "idPage": "6000000000000001",
        "accumulateUrlParams": false,
        "additionalTokens": []
      },
      "posX": 0.3,
      "posY": 0.4
    },
    {
      "idNode": "1000000000000003",
      "idFunnel": "8001000000000001",
      "nodeName": "Lander B",
      "nodeType": "lander",
      "nodePageParams": {
        "idPage": "6000000000000002",
        "accumulateUrlParams": false,
        "additionalTokens": []
      },
      "posX": 0.7,
      "posY": 0.4
    },
    {
      "idNode": "1000000000000004",
      "idFunnel": "8001000000000001",
      "nodeName": "Main Offer",
      "nodeType": "offer",
      "nodePageParams": {
        "idPage": "6000000000000003",
        "accumulateUrlParams": false,
        "additionalTokens": []
      },
      "posX": 0.5,
      "posY": 0.7
    }
  ],
  "connections": [
    {
      "idConnection": "2000000000000001",
      "idFunnel": "8001000000000001",
      "idSourceNode": "1000000000000001",
      "idTargetNode": "1000000000000002",
      "connectionRotatorParams": { "weight": 0.5 }
    },
    {
      "idConnection": "2000000000000002",
      "idFunnel": "8001000000000001",
      "idSourceNode": "1000000000000001",
      "idTargetNode": "1000000000000003",
      "connectionRotatorParams": { "weight": 0.5 }
    },
    {
      "idConnection": "2000000000000003",
      "idFunnel": "8001000000000001",
      "idSourceNode": "1000000000000002",
      "idTargetNode": "1000000000000004",
      "connectionPageParams": { "onActionNumber": 1, "isConversion": false }
    },
    {
      "idConnection": "2000000000000004",
      "idFunnel": "8001000000000001",
      "idSourceNode": "1000000000000003",
      "idTargetNode": "1000000000000004",
      "connectionPageParams": { "onActionNumber": 1, "isConversion": false }
    }
  ]
}
```

---

## Updating a Funnel

### Endpoint

```
PUT /data/campaign/funnel/save/index.php?apiKey={key}&deleteDependencies=true
Content-Type: application/json
```

The `deleteDependencies` query parameter is **required** for PUT requests.

- **`deleteDependencies=true`** -- deletes all existing nodes and connections for this funnel, then inserts whatever is in the request body. This is a **full replacement**. You must send the complete funnel state (all nodes and connections) every time.
- **`deleteDependencies=false`** -- does not delete existing nodes/connections before inserting. Use this only if you are certain there are no conflicts (e.g. duplicate IDs).

The request body format is identical to the POST request.

**Warning**: When `deleteDependencies=true`, any node-level statistics associated with deleted nodes will also be removed.

### Recommended Update Workflow

1. **GET** the current funnel via `/data/campaign/funnel/find/byId/index.php?apiKey={key}&idFunnel={id}`
2. Modify the returned object as needed
3. **PUT** it back with `deleteDependencies=true`

---

## Incremental Node/Connection Management

For adding or modifying individual nodes without replacing the entire funnel, use the dedicated endpoints:

### Create/Update a Single Node

```
POST /data/campaign/funnel/node/save/index.php?apiKey={key}       (create)
PUT  /data/campaign/funnel/node/save/index.php?apiKey={key}       (update)
```

Body: a single node object (same format as in the `nodes` array above).

### Create/Update a Single Connection

```
POST /data/campaign/funnel/connection/save/index.php?apiKey={key}  (create)
PUT  /data/campaign/funnel/connection/save/index.php?apiKey={key}  (update)
```

Body: a single connection object (same format as in the `connections` array above).

### Delete a Node

```
DELETE /data/campaign/funnel/node/delete/index.php?apiKey={key}&idNode={id}
```

### Delete a Connection

```
DELETE /data/campaign/funnel/connection/delete/index.php?apiKey={key}&idConnection={id}
```

### Query Nodes/Connections

```
GET /data/campaign/funnel/node/find/byId/index.php?apiKey={key}&idNode={id}
GET /data/campaign/funnel/node/find/byFunnel/index.php?apiKey={key}&idFunnel={id}
GET /data/campaign/funnel/connection/find/byId/index.php?apiKey={key}&idConnection={id}
GET /data/campaign/funnel/connection/find/byFunnel/index.php?apiKey={key}&idFunnel={id}
GET /data/campaign/funnel/connection/find/bySourceNodeId/index.php?apiKey={key}&idSourceNode={id}
GET /data/campaign/funnel/connection/find/byTargetNodeId/index.php?apiKey={key}&idTargetNode={id}
```

---

## Querying Funnels

```
GET /data/campaign/funnel/find/byId/index.php?apiKey={key}&idFunnel={id}
GET /data/campaign/funnel/find/byName/index.php?apiKey={key}&idCampaign={id}&name={name}
GET /data/campaign/funnel/find/byStatus/index.php?apiKey={key}&status={active|archived}
```

---

## Deleting a Funnel

```
DELETE /data/campaign/funnel/delete/index.php?apiKey={key}&idFunnel={id}
```

This deletes the funnel and all its nodes and connections.

---

## Prerequisites and Dependencies

Before creating a funnel, the following referenced entities must already exist:

| You're creating... | That references... | Which must exist as... |
|--------------------|--------------------|----------------------|
| The funnel itself | `idCampaign` | A campaign |
| A `lander` node | `nodePageParams.idPage` | A page of type "lander" |
| An `offer` node | `nodePageParams.idPage` | A page of type "offer" |
| A `jsCode` node | `nodeCodeParams.idCode` | A code snippet of type "javascript" |
| A `phpCode` node | `nodeCodeParams.idCode` | A code snippet of type "php" |
| A `condition` node | `nodeConditionParams.idCondition` | A condition |

The API validates these references at save time and will return an error if any are missing or mismatched.

---

## Error Handling

All errors return a JSON body:

```json
{
  "error": {
    "code": 400,
    "message": "Description of what went wrong"
  }
}
```

Common errors:

| HTTP Code | Cause |
|-----------|-------|
| 400 | Missing required field, invalid ID, invalid node/connection type, type mismatch (e.g. lander page ID pointing to an offer) |
| 403 | Invalid or missing API key |
| 404 | Referenced entity not found (funnel, page, code snippet, condition) |

---

## Recommended Approach for a Custom Funnel Editor

1. **Load existing entities** -- fetch campaigns, pages, offers, conditions, and code snippets so you have valid IDs to reference in nodes.
2. **Build the funnel object in memory** -- construct the full JSON with all nodes and connections.
3. **Generate unique IDs** -- use a reliable uint64 generation strategy for all new entities.
4. **Create via single POST** -- send the complete funnel with all nodes and connections in one request.
5. **For edits, use the full-replacement pattern** -- GET the funnel, modify it, PUT it back with `deleteDependencies=true`.
6. **For lightweight edits** -- use the individual node/connection endpoints to add or modify single elements without touching the rest.
