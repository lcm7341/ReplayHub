import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import prisma from '../lib/prisma';

interface ReplaySearchQuery {
  format?: string;
  fps?: number;
  name?: string;
  author?: string;
  verified?: boolean;
  levelId?: number;
  authorId?: number;
  page?: number;
  limit?: number;
}

interface ReplayCreateBody {
  format: string;
  fps: number;
  name: string;
  author: string;
  verified?: boolean;
  levelId: number;
  authorId: number;
  data: string; // Base64 encoded string for Bytes
}

export default async function replayRoutes(fastify: FastifyInstance) {
  
  // Search Replays
  fastify.get<{ Querystring: ReplaySearchQuery }>('/replays', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string' },
          fps: { type: 'number' },
          name: { type: 'string' },
          author: { type: 'string' },
          verified: { type: 'boolean' },
          levelId: { type: 'integer' },
          authorId: { type: 'integer' },
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 50 }
        }
      }
    }
  }, async (request, reply) => {
    const { 
      format, fps, name, author, verified, levelId, authorId, 
      page = 1, limit = 50 
    } = request.query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (format) where.format = { equals: format }; // Exact match for format
    if (fps) where.fps = { equals: fps }; // Exact match for FPS (consider range if needed)
    // Use contains with insensitive mode for partial text search
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (author) where.author = { contains: author, mode: 'insensitive' };
    if (verified !== undefined) where.verified = verified;
    if (levelId) where.levelId = levelId;
    if (authorId) where.authorId = authorId;

    try {
      const [total, replays] = await prisma.$transaction([
        prisma.replay.count({ where }),
        prisma.replay.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          // Don't return the heavy 'data' field in list view
          select: {
            id: true,
            format: true,
            fps: true,
            name: true,
            author: true,
            verified: true,
            levelId: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
          }
        })
      ]);

      return {
        data: replays,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Download Replay File
  fastify.get<{ Params: { id: string } }>('/replays/:id/download', async (request, reply) => {
    const id = parseInt(request.params.id);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid replay ID' });
    }

    try {
      const replay = await prisma.replay.findUnique({
        where: { id },
        select: { data: true, name: true, format: true }
      });

      if (!replay) {
        return reply.status(404).send({ error: 'Replay not found' });
      }

      const filename = `${replay.name.replace(/[^a-z0-9]/gi, '_')}${replay.format}`;
      
      // Set headers to force download
      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      
      return reply.send(replay.data);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Create Replay
  fastify.post<{ Body: ReplayCreateBody }>('/replays', {
    schema: {
      body: {
        type: 'object',
        required: ['format', 'fps', 'name', 'author', 'levelId', 'authorId', 'data'],
        properties: {
          format: { type: 'string' },
          fps: { type: 'number' },
          name: { type: 'string' },
          author: { type: 'string' },
          verified: { type: 'boolean' },
          levelId: { type: 'integer' },
          authorId: { type: 'integer' },
          username: { type: 'string' },
          data: { type: 'string' } // Base64
        }
      }
    }
  }, async (request, reply) => {
    // Extract username separately as it's not part of the Replay model directly
    const { data, username, authorId, ...rest } = request.body as any; // Cast to any to access username which isn't in ReplayCreateBody interface yet

    if (!username) {
      return reply.status(400).send({ error: 'Username is required' });
    }

    const buffer = Buffer.from(data, 'base64');
    const hash = createHash('sha256').update(buffer).digest('hex');

    try {
      // Find or create the user
      let user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user) {
        user = await prisma.user.create({
          data: { username }
        });
      }

      // If verified is true, ensure the user is allowed to verify
      if (rest.verified && !user.verified) {
        return reply.status(403).send({ error: 'User is not authorized to verify replays.' });
      }

      const nameMatches = await prisma.replay.findMany({
        where: {
          name: { equals: rest.name.trim(), mode: 'insensitive' }
        },
        select: { id: true, hash: true }
      });

      if (nameMatches.some((row) => row.hash && row.hash === hash)) {
        return reply.status(409).send({ error: 'Replay already exists with the same name and contents.' });
      }

      const levelMatches = await prisma.replay.findMany({
        where: { levelId: rest.levelId },
        select: { id: true, hash: true }
      });

      if (levelMatches.some((row) => row.hash && row.hash === hash)) {
        return reply.status(409).send({ error: 'This exact replay file already exists for the level.' });
      }

      const replay = await prisma.replay.create({
        data: {
          ...rest,
          authorId, // Pass authorId explicitly as the GD Author ID (int)
          data: buffer,
          hash,
          verified: rest.verified || false,
          uploadedBy: {
            connect: { id: user.id }
          }
        }
      });

      return reply.status(201).send(replay);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Failed to create replay' });
    }
  });
}

