# Message Queue System Documentation

## Overview

Okos Telegram AI Assistant uses BullMQ to implement a robust message processing system. This queue system ensures that:

1. Messages from the same user are processed sequentially
2. Multiple users can be served concurrently
3. The system can handle high loads without crashing
4. Failed jobs are properly retried and logged

## Architecture

The queue system consists of the following components:

### 1. Queue Service (`src/services/queue.ts`)

A singleton service that manages:

- Message queue creation and configuration
- Worker setup for processing messages
- Event handling for job completion, failures, and stallings
- Graceful shutdown of queue resources

### 2. Redis Connection (`src/services/redis.ts`)

- Provides a shared Redis connection for BullMQ
- Uses a singleton pattern to ensure only one connection is created

### 3. Configuration (`src/config.ts`)

Contains queue-specific configuration parameters:

- `concurrency`: Number of jobs to process concurrently (across different users)
- `maxJobsPerUser`: Maximum number of jobs processed simultaneously per user
- `jobsPerSecond`: Rate limit for job processing per user
- `retryAttempts`: Number of retry attempts for failed jobs
- `removeOnComplete`: Whether to remove completed jobs
- `removeOnFail`: Number of failed jobs to keep

### 4. Application Integration (`src/app.ts`)

- Initializes the queue service
- Sets up the worker with message processing logic
- Adds incoming messages to the queue instead of processing them immediately
- Handles graceful shutdown of queue on process termination

### 5. Telegram Service (`src/services/telegram.ts`)

- Implements a singleton pattern for the Telegram bot
- Separates bot creation from bot initialization (polling/webhook)
- Ensures only one instance of the bot is running to prevent conflicts
- Provides a centralized interface for sending messages and other Telegram operations

## Message Flow

1. User sends a message to the Telegram bot
2. The message is added to the queue with the user's chat ID as the group ID
3. The worker processes messages in the queue, ensuring that:
   - Messages from the same user are processed in order
   - Messages from different users can be processed concurrently
4. The message is processed by the appropriate handler based on its type (text, photo, sticker)
5. Results are sent back to the user via the Telegram API

## Error Handling

The queue system includes robust error handling:

1. Failed jobs are automatically retried with exponential backoff
2. Job failures are logged with detailed error information
3. Stalled jobs (those that don't complete within a timeout) are detected and logged
4. A maximum number of failed jobs are kept for debugging purposes

## Performance Considerations

- The system can handle multiple users concurrently while ensuring sequential processing per user
- Rate limiting prevents overwhelming the system during high load
- Graceful shutdown ensures no jobs are lost when the application is stopped

## Future Improvements

Potential enhancements to the queue system:

1. Implement job prioritization for different message types
2. Add monitoring and metrics collection
3. Implement more sophisticated rate limiting based on message complexity
4. Add a dashboard for queue monitoring and management
5. Implement job cancellation for outdated requests

## Troubleshooting

### Common Issues

#### Redis Connection Issues

BullMQ requires a stable Redis connection. For BullMQ specifically, we use a dedicated Redis connection with `maxRetriesPerRequest: null` to ensure proper queue operation.
