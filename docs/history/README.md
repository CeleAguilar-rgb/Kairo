# Historial

Sirve para abrir chats nuevos sin perder el contexto y sin gastar de más: en lugar de leer todo el proyecto o arrastrar conversaciones largas, cada sesión empieza leyendo un resumen corto.

```
history/
├── current.md                   Dónde nos quedamos (lo único que se lee siempre)
└── sessions/
    └── AAAA-MM-DD-tema.md       Una nota por sesión de trabajo
```

## Al empezar una sesión

1. Lee `CLAUDE.md` (se carga solo) y `docs/history/current.md`.
2. Lee **solo** las guías y archivos que pida la tarea de hoy (ver la tabla de `CLAUDE.md`).
3. **No leas** las notas de `sessions/` salvo que haga falta un detalle de algo pasado.
4. Confirma con el usuario en una línea qué se va a hacer hoy.

## Al terminar una sesión

Cuando el usuario diga que terminamos (o antes de que el chat se vuelva muy largo):

1. Crea `sessions/AAAA-MM-DD-tema.md` con la plantilla de abajo. Si hay varias el mismo día, agrega `-2`, `-3`.
2. Actualiza `current.md`: fase actual, lo último que se hizo, siguiente paso, pendientes y bloqueos. Borra de ahí lo que ya no aplica; debe seguir siendo corto.
3. Si se tomó una decisión nueva, regístrala también en `docs/guides/decisions.md`.
4. Si cambió el estado de un módulo, actualiza `docs/guides/roadmap.md`.
5. Haz commit de esos cambios junto con el trabajo de la sesión.

## Plantilla de sesión

```markdown
# AAAA-MM-DD · Tema

**Hecho en:** Claude Code / chat

## Qué se hizo
- …

## Decisiones tomadas
- … (también en docs/guides/decisions.md)

## Archivos o partes importantes que se tocaron
- …

## Quedó pendiente
- …

## Notas para la siguiente sesión
- …
```

## Reglas

- Escribe para alguien que no vio la conversación: concreto, sin "como dijimos".
- Nada de secretos, contraseñas, llaves ni datos personales reales.
- Las notas de sesión no se editan después; si algo cambió, se anota en la siguiente.
