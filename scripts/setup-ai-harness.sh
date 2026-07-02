#!/usr/bin/env bash
#
# setup-ai-harness.sh
#
# Manage repo-local AI harness symlinks.
#
# Canonical sources:
#   - AGENTS.md files (root and nested) — repo guidance.
#   - .ai/skills/<name>/SKILL.md       — repo-specific skill bodies; generic skills are global.
#   - .ai/rules/<name>.mdc             — Cursor rule bodies.
#   - .ai/agents/<role>.toml           — repo-specific Codex agent definitions; generic agents are global.
#
# Generated symlinks:
#   - <dir>/CLAUDE.md          -> AGENTS.md
#   - .claude/skills/<name>    -> ../../.ai/skills/<name> (repo-specific only)
#   - .agents/skills/<name>    -> ../../.ai/skills/<name> (repo-specific only)
#   - .cursor/skills/<name>    -> ../../.ai/skills/<name>
#   - .cursor/rules/<name>.mdc -> ../../.ai/rules/<name>.mdc
#   - .codex/agents/<role>.toml -> ../../.ai/agents/<role>.toml (repo-specific only)

if [ -n "${POSIXLY_CORRECT:-}" ] || [ -z "${BASH_VERSION:-}" ]; then
    exec bash "$0" "$@"
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${AI_SYMLINK_ROOT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
AI_SKILLS_DIR="$ROOT_DIR/.ai/skills"
AI_RULES_DIR="$ROOT_DIR/.ai/rules"
AI_AGENTS_DIR="$ROOT_DIR/.ai/agents"
CLAUDE_SKILLS_DIR="$ROOT_DIR/.claude/skills"
AGENTS_SKILLS_DIR="$ROOT_DIR/.agents/skills"
CURSOR_SKILLS_DIR="$ROOT_DIR/.cursor/skills"
CURSOR_RULES_DIR="$ROOT_DIR/.cursor/rules"
CODEX_AGENTS_DIR="$ROOT_DIR/.codex/agents"
MODE="${1:-install}"

find_agents_files() {
    find "$ROOT_DIR" \
        \( \
            \( -type d \( -name ".git" -o -name "node_modules" -o -name "vendor" -o -name "build" -o -name "dist" \) \) \
            -o \( -type d \( -name "_worktree*" -o -name ".worktrees" \) ! -path "$ROOT_DIR" \) \
        \) -prune \
        -o -type f -name "AGENTS.md" -print0
}

list_skills() {
    [ -d "$AI_SKILLS_DIR" ] || return 0
    find "$AI_SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' d; do
        [ -f "$d/SKILL.md" ] && printf '%s\0' "$(basename "$d")"
    done
}

list_agents() {
    [ -d "$AI_AGENTS_DIR" ] || return 0
    find "$AI_AGENTS_DIR" -mindepth 1 -maxdepth 1 -type f -name '*.toml' -print0 | while IFS= read -r -d '' f; do
        printf '%s\0' "$(basename "$f" .toml)"
    done
}

list_rules() {
    [ -d "$AI_RULES_DIR" ] || return 0
    find "$AI_RULES_DIR" -mindepth 1 -maxdepth 1 -type f -name '*.mdc' -print0 | while IFS= read -r -d '' f; do
        printf '%s\0' "$(basename "$f")"
    done
}

is_link_to() {
    local path="$1" target="$2"
    [ -L "$path" ] && [ "$(readlink "$path")" = "$target" ]
}

install_guidance_links() {
    local created=0 existing=0 skipped=0
    while IFS= read -r -d '' agents; do
        local dir claude
        dir="$(dirname "$agents")"
        claude="$dir/CLAUDE.md"
        if [ -e "$claude" ] || [ -L "$claude" ]; then
            if is_link_to "$claude" "AGENTS.md"; then
                existing=$((existing + 1))
            else
                echo "skip   $claude (exists and is not managed)"
                skipped=$((skipped + 1))
            fi
        else
            ln -s "AGENTS.md" "$claude"
            echo "link   $claude -> AGENTS.md"
            created=$((created + 1))
        fi
    done < <(find_agents_files)
    GUIDANCE_CREATED=$created
    GUIDANCE_EXISTING=$existing
    GUIDANCE_SKIPPED=$skipped
}

install_skill_links_for() {
    local parent="$1" label="$2" created=0 existing=0 skipped=0
    mkdir -p "$parent"
    while IFS= read -r -d '' name; do
        local link="$parent/$name"
        if [ -e "$link" ] || [ -L "$link" ]; then
            if is_link_to "$link" "../../.ai/skills/$name"; then
                existing=$((existing + 1))
            else
                echo "skip   $link (exists and is not managed)"
                skipped=$((skipped + 1))
            fi
        else
            ln -s "../../.ai/skills/$name" "$link"
            echo "link   $link -> ../../.ai/skills/$name"
            created=$((created + 1))
        fi
    done < <(list_skills)
    eval "${label}_CREATED=$created"
    eval "${label}_EXISTING=$existing"
    eval "${label}_SKIPPED=$skipped"
}

install_agent_links() {
    local created=0 existing=0 skipped=0
    mkdir -p "$CODEX_AGENTS_DIR"
    while IFS= read -r -d '' name; do
        local link="$CODEX_AGENTS_DIR/$name.toml"
        if [ -e "$link" ] || [ -L "$link" ]; then
            if is_link_to "$link" "../../.ai/agents/$name.toml"; then
                existing=$((existing + 1))
            else
                echo "skip   $link (exists and is not managed)"
                skipped=$((skipped + 1))
            fi
        else
            ln -s "../../.ai/agents/$name.toml" "$link"
            echo "link   $link -> ../../.ai/agents/$name.toml"
            created=$((created + 1))
        fi
    done < <(list_agents)
    CODEX_AGENTS_CREATED=$created
    CODEX_AGENTS_EXISTING=$existing
    CODEX_AGENTS_SKIPPED=$skipped
}

install_rule_links() {
    local created=0 existing=0 skipped=0
    mkdir -p "$CURSOR_RULES_DIR"
    while IFS= read -r -d '' name; do
        local link="$CURSOR_RULES_DIR/$name"
        if [ -e "$link" ] || [ -L "$link" ]; then
            if is_link_to "$link" "../../.ai/rules/$name"; then
                existing=$((existing + 1))
            else
                echo "skip   $link (exists and is not managed)"
                skipped=$((skipped + 1))
            fi
        else
            ln -s "../../.ai/rules/$name" "$link"
            echo "link   $link -> ../../.ai/rules/$name"
            created=$((created + 1))
        fi
    done < <(list_rules)
    CURSOR_RULES_CREATED=$created
    CURSOR_RULES_EXISTING=$existing
    CURSOR_RULES_SKIPPED=$skipped
}

status_report() {
    local guidance_ok=0 guidance_other=0 claude_skills=0 agent_skills=0 cursor_skills=0 cursor_rules=0 codex_agents=0
    while IFS= read -r -d '' agents; do
        local claude
        claude="$(dirname "$agents")/CLAUDE.md"
        if is_link_to "$claude" "AGENTS.md"; then
            guidance_ok=$((guidance_ok + 1))
        elif [ -e "$claude" ] || [ -L "$claude" ]; then
            guidance_other=$((guidance_other + 1))
            echo "other guidance: $claude"
        fi
    done < <(find_agents_files)
    while IFS= read -r -d '' name; do
        is_link_to "$CLAUDE_SKILLS_DIR/$name" "../../.ai/skills/$name" && claude_skills=$((claude_skills + 1))
        is_link_to "$AGENTS_SKILLS_DIR/$name" "../../.ai/skills/$name" && agent_skills=$((agent_skills + 1))
        is_link_to "$CURSOR_SKILLS_DIR/$name" "../../.ai/skills/$name" && cursor_skills=$((cursor_skills + 1))
    done < <(list_skills)
    while IFS= read -r -d '' name; do
        is_link_to "$CURSOR_RULES_DIR/$name" "../../.ai/rules/$name" && cursor_rules=$((cursor_rules + 1))
    done < <(list_rules)
    while IFS= read -r -d '' name; do
        is_link_to "$CODEX_AGENTS_DIR/$name.toml" "../../.ai/agents/$name.toml" && codex_agents=$((codex_agents + 1))
    done < <(list_agents)
    echo "guidance links: $guidance_ok managed, $guidance_other other"
    echo ".claude skill links: $claude_skills"
    echo ".agents skill links: $agent_skills"
    echo ".cursor skill links: $cursor_skills"
    echo ".cursor rule links: $cursor_rules"
    echo ".codex agent links: $codex_agents"
}

case "$MODE" in
    install|repair)
        install_guidance_links
        install_skill_links_for "$CLAUDE_SKILLS_DIR" "CLAUDE_SKILLS"
        install_skill_links_for "$AGENTS_SKILLS_DIR" "AGENTS_SKILLS"
        install_skill_links_for "$CURSOR_SKILLS_DIR" "CURSOR_SKILLS"
        install_rule_links
        install_agent_links
        echo "Summary"
        echo "  CLAUDE.md links: created=${GUIDANCE_CREATED:-0} existing=${GUIDANCE_EXISTING:-0} skipped=${GUIDANCE_SKIPPED:-0}"
        echo "  .claude/skills: created=${CLAUDE_SKILLS_CREATED:-0} existing=${CLAUDE_SKILLS_EXISTING:-0} skipped=${CLAUDE_SKILLS_SKIPPED:-0}"
        echo "  .agents/skills: created=${AGENTS_SKILLS_CREATED:-0} existing=${AGENTS_SKILLS_EXISTING:-0} skipped=${AGENTS_SKILLS_SKIPPED:-0}"
        echo "  .cursor/skills: created=${CURSOR_SKILLS_CREATED:-0} existing=${CURSOR_SKILLS_EXISTING:-0} skipped=${CURSOR_SKILLS_SKIPPED:-0}"
        echo "  .cursor/rules: created=${CURSOR_RULES_CREATED:-0} existing=${CURSOR_RULES_EXISTING:-0} skipped=${CURSOR_RULES_SKIPPED:-0}"
        echo "  .codex/agents: created=${CODEX_AGENTS_CREATED:-0} existing=${CODEX_AGENTS_EXISTING:-0} skipped=${CODEX_AGENTS_SKIPPED:-0}"
        ;;
    status)
        status_report
        ;;
    *)
        echo "Usage: $0 {install|repair|status}" >&2
        exit 1
        ;;
esac
