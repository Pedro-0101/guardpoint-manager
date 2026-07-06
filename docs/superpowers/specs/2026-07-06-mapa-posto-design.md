# Design — Mapa interativo na criação/edição de Posto

Data: 2026-07-06

## Contexto

O formulário de posto (`postos-form`, dialog Material) exigia digitar latitude/longitude
manualmente, sem feedback visual do ponto nem do raio de tolerância. Isso é propenso a erro
e obriga o operador a conferir as coordenadas em outra ferramenta.

## Solução

### Mapa embutido no dialog

- Mapa Leaflet (já dependência do projeto, CSS global em `styles.scss`) embutido no
  `<mat-dialog-content>` do `postos-form`, entre os campos de coordenadas e o raio.
- Tiles OpenStreetMap, mesmo padrão do `mapa.component` existente.
- Criação: mapa centrado no Brasil (zoom 4), sem marcador até o usuário escolher um ponto.
- Edição: mapa já abre enquadrando o posto com marcador e círculo.
- Clique no mapa ou arrasto do marcador preenche `latitude`/`longitude` no form
  (arredondado a 6 casas decimais).
- Marcador via `L.divIcon` com estilo inline (evita o problema de imagens quebradas do
  ícone default do Leaflet e o uso de `::ng-deep`).

### Raio de tolerância dinâmico

- `L.circle` com `radius = raioM` (metros, mapeamento direto).
- Sincronização via `form.valueChanges` (debounce 150 ms): alterar `raioM` redimensiona o
  círculo; coordenadas inválidas ou default (0,0) removem marcador e círculo.
- Quando a mudança vem dos inputs (digitação/colagem), o mapa enquadra o círculo
  (`fitBounds`); quando vem do próprio mapa (clique/drag), a vista é mantida.

### Colar coordenadas do Google Maps

- Utilitário puro `parseCoordenadas` em `src/app/shared/utils/coordenadas.util.ts`:
  - DMS do Google Maps: `23°12'05.6"S 47°35'56.3"W`, tolerante a aspas/apóstrofos Unicode
    (`′ ″ ’ ”`) e hemisférios em português (`O`/`L`).
  - Decimal: `-23.201556, -47.598972` (vírgula e/ou espaço).
  - Retorna `null` para entrada não reconhecida ou fora de faixa (lat ±90, lng ±180).
- Handler `(paste)` nos inputs de latitude e longitude: se o texto colado for um par
  reconhecível, preenche os dois campos e centraliza o mapa; senão, o paste segue normal.

## Decisões de brainstorming

- Mapa sempre visível no dialog (criação e edição), sem toggle.
- Dialog alargado de 560px para 640px (`maxWidth: 95vw`).
- Leaflet embutido no próprio dialog (vs. dialog separado de seleção) — menos passos para
  o operador e o círculo fica visível junto dos campos.
- Marcador arrastável incluído.
- Testes: apenas o parser (função pura, vitest); o mapa Leaflet não é testado em jsdom.
  `iniciarMapa` é guardado contra container ausente.

## Fora de escopo

- Geocoding / busca por endereço.
- Tiles offline ou fallback sem internet (mesmo comportamento do mapa existente).
- Mudanças no modelo `Posto` ou na API (lat/lng/raioM continuam como estão).
