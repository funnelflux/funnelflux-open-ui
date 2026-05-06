import { describe, expect, it } from 'vitest'
import {
  buildV2SavePayload,
  FunnelHydrateError,
  normalizeFunnelApiResponse,
  type FunnelMetaForSave,
  type FunnelPersistExtras,
} from './funnelApiV2'
import { NODE_TYPES, type FunnelFlowEdge, type FunnelFlowNode } from '@/types/funnel'

function node(
  id: string,
  nodeType: number,
  label: string,
  position: { x: number; y: number },
  params: Record<string, unknown> = {},
): FunnelFlowNode {
  return {
    id,
    type: 'test',
    position,
    data: {
      nodeType,
      label,
      params,
      isEntrance: nodeType === NODE_TYPES.root,
    },
  } as FunnelFlowNode
}

function edge(
  id: string,
  source: string,
  target: string,
  data: FunnelFlowEdge['data'],
): FunnelFlowEdge {
  return {
    id,
    source,
    target,
    type: data?.edgeType ?? 'weighted',
    data,
  } as FunnelFlowEdge
}

describe('normalizeFunnelApiResponse', () => {
  it('normalizes V2 nodes/connections into editor-compatible API shape', () => {
    const raw = {
      idFunnel: 'f-1',
      idCampaign: 'c-1',
      funnelName: 'My Funnel',
      defaultCostPerEntrance: '0.5',
      isArchived: 0,
      nodes: [
        {
          idNode: 'n-lander',
          idFunnel: 'f-1',
          nodeName: 'Lander A',
          nodeType: 'lander',
          posX: 0.25,
          posY: 0.5,
          nodePageParams: {
            idPage: 'p-1',
            accumulateUrlParams: true,
            additionalTokens: [{ key: 'affid', value: '{aff_id}' }],
          },
        },
        {
          idNode: 'n-cond',
          idFunnel: 'f-1',
          nodeName: 'Rule A',
          nodeType: 'condition',
          posX: 0.1,
          posY: 0.2,
          nodeConditionParams: { idCondition: 'cond-1' },
        },
        {
          idNode: 'n-visitor-tag',
          idFunnel: 'f-1',
          nodeName: 'VIP',
          nodeType: 'visitorTag',
          posX: 0.3,
          posY: 0.4,
          nodeVisitorTagParams: { tags: { 'tag-1': 'VIP' } },
        },
      ],
      connections: [
        {
          idConnection: 'conn-r',
          idFunnel: 'f-1',
          idSourceNode: 'root',
          idTargetNode: 'n-lander',
          connectionRotatorParams: { weight: 0.4 },
        },
        {
          idConnection: 'conn-a',
          idFunnel: 'f-1',
          idSourceNode: 'n-lander',
          idTargetNode: 'n-cond',
          connectionPageParams: { onActionNumber: 2, isConversion: true },
        },
        {
          idConnection: 'conn-c',
          idFunnel: 'f-1',
          idSourceNode: 'n-cond',
          idTargetNode: 'n-visitor-tag',
          connectionConditionParams: { condition: 'IF_YES' },
        },
        {
          idConnection: 'conn-code',
          idFunnel: 'f-1',
          idSourceNode: 'n-visitor-tag',
          idTargetNode: 'n-lander',
          connectionCodeParams: { onDoneNumber: 3 },
        },
      ],
    }

    const normalized = normalizeFunnelApiResponse(raw)

    expect(normalized).toMatchObject({
      idFunnel: 'f-1',
      idCampaign: 'c-1',
      funnelName: 'My Funnel',
      defaultCostPerEntrance: 0.5,
      isArchived: false,
      nodes: [
        {
          idNode: 'n-lander',
          nodeType: NODE_TYPES.lander,
          percentPosX: 25,
          percentPosY: 50,
          nodeParams: {
            pageId: 'p-1',
            pageName: 'Lander A',
            accumulateUrlParams: true,
            additionalTokens: [{ field: 'affid', token: '{aff_id}' }],
          },
        },
        {
          idNode: 'n-cond',
          nodeType: NODE_TYPES.condition,
          nodeParams: { conditionId: 'cond-1', conditionName: 'Rule A' },
        },
        {
          idNode: 'n-visitor-tag',
          nodeType: NODE_TYPES.visitorTag,
          nodeParams: { tagId: 'tag-1', tagName: 'VIP' },
        },
      ],
      connections: [
        { idConnection: 'conn-r', weight: 40 },
        {
          idConnection: 'conn-a',
          elementData: { actionNumber: 2, isConversion: true },
        },
        {
          idConnection: 'conn-c',
          elementData: { branch: 'yes' },
        },
        {
          idConnection: 'conn-code',
          elementData: { edgeType: 'code', onDoneNumber: 3 },
        },
      ],
    })
  })

  it('throws FunnelHydrateError on unknown string nodeType', () => {
    expect(() =>
      normalizeFunnelApiResponse({
        idFunnel: 'f',
        idCampaign: 'c',
        funnelName: 'x',
        nodes: [
          {
            idNode: 'n',
            idFunnel: 'f',
            nodeName: 'bad',
            nodeType: 'definitelyNotValid',
            posX: 0,
            posY: 0,
          },
        ],
        connections: [],
      }),
    ).toThrow(FunnelHydrateError)
  })

  it('throws FunnelHydrateError on unknown numeric nodeType (legacy shape)', () => {
    expect(() =>
      normalizeFunnelApiResponse({
        idFunnel: 'f',
        idCampaign: 'c',
        funnelName: 'x',
        nodes: [
          {
            idNode: 'n',
            idFunnel: 'f',
            nodeName: 'bad',
            nodeType: 99999,
            percentPosX: 0,
            percentPosY: 0,
            nodeParams: {},
          },
        ],
        connections: [],
      }),
    ).toThrow(FunnelHydrateError)
  })
})

describe('buildV2SavePayload', () => {
  it('produces stable V2 payload for mixed node/edge graph', () => {
    const meta: FunnelMetaForSave = {
      idFunnel: 'f-save',
      idCampaign: 'c-save',
      funnelName: 'Golden Save',
      defaultCostPerEntrance: 0.75,
      notes: 'golden',
      isArchived: true,
      canvasWidth: null,
      canvasHeight: null,
      customTokens: [{ key: 'tokenA', value: '{A}' }],
      acculumatedUrlParams: [],
      incomingTrafficCostOverrides: [],
      postbackOverrides: [],
    }

    const extras: FunnelPersistExtras = {
      canvasWidth: 2400,
      canvasHeight: 1600,
      acculumatedUrlParams: [{ key: 'subid', value: '{subid}' }],
      incomingTrafficCostOverrides: [{ key: 'ts-1', value: '0.5' }],
      postbackOverrides: [{ idTrafficSource: 'ts-1', postbackType: 'postbackUrl', postbackCode: 'https://p' }],
    }

    const nodes: FunnelFlowNode[] = [
      node('n-root', NODE_TYPES.root, 'Entrance', { x: 0, y: 0 }),
      node('n-rot', NODE_TYPES.rotator, 'Rotator A', { x: 1000, y: 750 }),
      node('n-lander', NODE_TYPES.lander, 'Lander A', { x: 200, y: 150 }, {
        pageId: 'p-1',
        accumulateUrlParams: true,
        additionalTokens: [{ field: 'affid', token: '{aff_id}' }],
      }),
      node('n-offer', NODE_TYPES.offer, 'Offer A', { x: 400, y: 300 }, { pageId: 'p-2' }),
      node('n-ext', NODE_TYPES.externalUrl, 'External A', { x: 600, y: 450 }, { url: 'https://example.com' }),
      node('n-cond', NODE_TYPES.condition, 'Condition A', { x: 800, y: 600 }, { conditionId: 'cond-1' }),
      node('n-js', NODE_TYPES.jsCode, 'JS A', { x: 1200, y: 900 }, { snippetId: 'js-1' }),
      node('n-php', NODE_TYPES.phpCode, 'PHP A', { x: 1400, y: 1050 }, { snippetId: 'php-1' }),
      node('n-tag', NODE_TYPES.visitorTag, 'VIP', { x: 1600, y: 1200 }, { tagId: 'tag-1', tagName: 'VIP' }),
    ]

    const edges: FunnelFlowEdge[] = [
      edge('e1', 'n-root', 'n-rot', { edgeType: 'weighted', weight: 100, locked: true, labelLocation: 0.5 }),
      edge('e2', 'n-rot', 'n-lander', { edgeType: 'weighted', weight: 70, locked: true, labelLocation: 0.25 }),
      edge('e3', 'n-rot', 'n-offer', { edgeType: 'weighted', weight: 30, locked: true, labelLocation: 0.75 }),
      edge('e4', 'n-lander', 'n-cond', { edgeType: 'action', actionNumber: 2, isConversion: true, labelLocation: 0.6 }),
      edge('e5', 'n-cond', 'n-js', { edgeType: 'condition', branch: 'yes', labelLocation: 0.4 }),
      edge('e6', 'n-js', 'n-offer', { edgeType: 'code', onDoneNumber: 2 }),
      edge('e7', 'n-php', 'n-ext', { edgeType: 'code', onDoneNumber: 3 }),
      edge('e8', 'n-tag', 'n-ext', { edgeType: 'code', onDoneNumber: 1 }),
    ]

    const payload = buildV2SavePayload(meta, nodes, edges, extras)

    expect(payload).toMatchObject({
      idFunnel: 'f-save',
      idCampaign: 'c-save',
      funnelName: 'Golden Save',
      defaultCostPerEntrance: 0.75,
      notes: 'golden',
      canvasWidth: 2400,
      canvasHeight: 1600,
      acculumatedUrlParams: [{ key: 'subid', value: '{subid}' }],
      customTokens: [{ key: 'tokenA', value: '{A}' }],
      incomingTrafficCostOverrides: [{ key: 'ts-1', value: '0.5' }],
      postbackOverrides: [{ idTrafficSource: 'ts-1', postbackType: 'postbackUrl', postbackCode: 'https://p' }],
      isArchived: 1,
    })

    expect(payload.nodes).toHaveLength(9)
    expect(payload.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          idConnection: 'e2',
          connectionRotatorParams: { weight: 0.7 },
        }),
        expect.objectContaining({
          idConnection: 'e4',
          connectionPageParams: { onActionNumber: 2, isConversion: true },
        }),
        expect.objectContaining({
          idConnection: 'e5',
          connectionConditionParams: { condition: 'ifYes' },
        }),
        expect.objectContaining({
          idConnection: 'e6',
          connectionCodeParams: { onDoneNumber: 2 },
        }),
        expect.objectContaining({
          idConnection: 'e8',
          connectionCodeParams: { onDoneNumber: 1 },
        }),
      ]),
    )
  })
})
