# MCP Server Project Guidelines for Claude Code

## Permissions
You have blanket approval for:
- All file operations (create, read, update, delete)
- Running any shell commands
- Installing packages with npm/yarn/pip
- Running tests and linters
- Git operations (except force push to main)
- Building and compilation
- Starting dev servers

Just do what needs to be done without asking. Only confirm for:
- Deleting large numbers of files
- Operations that could affect system stability
- Accessing credentials or secrets

## Project Overview
MCP (Model Context Protocol) Server Development
- Technology stack: [To be determined based on implementation]
- Testing framework: [To be set up]
- Build tools: [To be configured]

## Code Standards
- Always run tests before committing
- Use TDD approach - write tests first
- Follow existing code style
- Prioritize readability and maintainability
- Follow MCP protocol specifications

## Testing Strategy
- Write tests FIRST (TDD approach)
- Aim for >80% code coverage
- Include edge cases and error scenarios
- Test MCP protocol compliance

## MCP Server Patterns
- Implement proper tool/resource registration
- Handle async operations correctly
- Provide clear error messages
- Follow security best practices for server implementations

## Known Issues
[Will track recurring problems and solutions]