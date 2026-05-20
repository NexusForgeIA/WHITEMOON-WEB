---
name: git-flow
description: WhiteMoon git workflow — branch + PR conventions, commit message types, gh CLI flow and no-gh fallback. Use for git operations in WhiteMoon repos.
---

# SKILL: Git Flow WhiteMoon

## Flujo estándar
git checkout -b fix/descripcion
git add -A
git commit -m "fix: descripción"
git push origin fix/descripcion
gh pr create --title "fix: desc" --base main --head fix/descripcion
gh pr merge fix/descripcion --merge --delete-branch

## Sin gh CLI
git checkout main
git merge --squash [rama]
git commit -m "fix: descripción"
git push origin main

## Convenciones commits
feat: nueva funcionalidad
fix: corrección
docs: documentación
style: cambios visuales
refactor: refactorización
