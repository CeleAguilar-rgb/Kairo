# 2026-11-11 · Temas de color

**Hecho en:** Claude Code, directo en `main` (a pedido de la usuaria).

## Qué se hizo

- Se copiaron del canvas a `docs/design/screens/` 12 pantallas nuevas: `Temas`, `PaletaTonos` y las 10 de la app de teléfono (`App*`), más el `canvas.json` actualizado. Las demás pantallas solo cambiaban en los saltos de línea y no se copiaron.
- Temas de color (decisión #58):
  - `packages/shared`: `COLOR_THEMES`, `THEME_INTENSITIES` y `updateAppearanceSchema`.
  - API: migración `0015_color_themes` (dos enums y dos columnas en `profiles`, aplicada) y `PATCH /v1/me/appearance`.
  - `styles/palettes.css`, generado con un script desde `Temas.dc.html` (el script no quedó en el repo).
  - `light.css` y `dark.css` sobre `--p-*`, más `modes/intensity.css`.
  - Se quitaron los primitivos `--lavender-*` de `tokens.css`.
  - Cookie `kairo_appearance`, `data-palette` y `data-intensity` en `<html>`, y `AppearanceSync`.
  - En Perfil → Preferencias: "Tema de color" (12 chips) e "Intensidad" (Sutil, Teñido, Intenso).

## Qué se probó

- `test/account.e2e-spec.ts`: 14 tests, 3 nuevos (aislamiento con `userId` en el body, 400 con valores que no existen, 401 sin token).
- `tsc` en web y API, y ESLint en web.
- Demo en el navegador del app:
  - Salvia + Teñido en claro y Durazno + Intenso en oscuro, en Inicio y Perfil.
  - El tema se conserva al recargar.
  - Lavanda + Sutil + Claro da exactamente los mismos valores que antes (10 variables comparadas).
  - A 375 px, sin scroll lateral.

## Qué no se probó

- Con la cuenta real de la usuaria, y entrar desde otro dispositivo con la cookie distinta (`AppearanceSync`).
- El resto de los e2e.
- Los otros 10 temas, uno por uno, en todas las pantallas. El contraste de Teñido e Intenso no se midió con la auditoría automática.

## Decidido en la sesión

- En oscuro, el fondo suave sigue a `Temas.dc.html` (tono 900 con texto 200) y no al "sin morado de relleno" de `ModoOscuro.dc.html`: lo eligió la usuaria.

## Pendiente de decidir

- `--mood-5` en claro pasó de `#9d96e8` a `#aaa4f0`, el tono 400 de la escala; es el único cambio visible con Lavanda + Sutil.
- El saludo en Intenso: el canvas lo pinta del color del tema y aquí no se hizo, porque pediría tocar el componente del saludo.
