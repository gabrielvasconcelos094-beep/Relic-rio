# Relicário

Um arquivo pessoal e privado de afeto, palavras e memórias.

Relicário guarda o que alguém lhe disse, o que alguém fez, as cartas, as fotografias e os
pequenos acontecimentos que costumam se perder em conversas e galerias. Tudo fica no próprio
aparelho: não existe conta, servidor nem sincronização.

---

## O que está implementado

| Área | Situação |
| --- | --- |
| Criar, editar e excluir memórias | funcional, com validação e confirmação de exclusão |
| Anexos (imagens, PDFs, áudios, vídeos, documentos) | guardados como arquivo no IndexedDB, com legenda, troca e remoção |
| Data do acontecimento ≠ data do registro | campos separados, com precisão por dia, mês ou ano |
| Pessoas, perfis e linha do tempo individual | funcional, memória pode ter várias pessoas ou nenhuma |
| Categorias iniciais e personalizadas | criação, renomeação, cor, ícone e remoção |
| Tags livres | criação, reutilização, renomeação em massa e exclusão |
| Busca e filtros combináveis | título, texto, pessoa, categoria, tag, data, contexto e anotações |
| Linha do tempo (ano → mês → dia) | funcional |
| Galeria com visualização em tela cheia | funcional |
| Favoritos | funcional |
| Para os dias difíceis + memória aleatória | funcional |
| Surpreenda-me, com escopo selecionável | funcional, sorteio sem repetir enquanto houver alternativa |
| Hoje, no passado | funcional, estado vazio honesto quando não há nada na data |
| Cartas para o futuro (cápsulas) | funcional, com lacre por data e lembrete .ics real |
| Estatísticas | calculadas a partir dos dados reais |
| Tema claro, escuro e do sistema | funcional |
| PIN (PBKDF2-SHA256) e biometria | funcional; biometria depende do suporte do aparelho |
| Backup .zip, conferência, restauração, exportações | funcional; o backup é relido e verificado após ser gerado |
| Funcionamento offline | service worker + IndexedDB |

### Limites declarados

- **Não há notificações.** As cápsulas ficam lacradas até a data escolhida e geram um arquivo
  `.ics` que você adiciona ao calendário do aparelho. É um lembrete real do sistema, não uma
  notificação simulada.
- **A biometria depende do aparelho** (WebAuthn com autenticador de plataforma). Quando não há
  suporte, a opção aparece desativada e explica o motivo; o PIN continua funcionando.
- **O PIN não entra no backup** e não pode ser recuperado se esquecido.
- Os dados de demonstração são opcionais, ficam marcados e podem ser removidos de uma vez sem
  tocar nos registros reais (Configurações → Armazenamento).

---

## Tecnologia

- React 18 + TypeScript + Vite
- IndexedDB como banco local (sem dependências de ORM), com anexos guardados como `Blob`
- `fflate` para gerar e ler os backups `.zip`
- Capacitor 6 para empacotar como aplicativo Android nativo
- Nenhuma chamada de rede em tempo de execução

### Estrutura

```
src/
  db/          tipos, camada IndexedDB, operações do arquivo e categorias iniciais
  state/       contextos de dados (ArchiveContext), interface (UiContext) e bloqueio
  screens/     uma tela por rota
  components/  cartões, anexos, filtros, leitor, galeria e primitivos de interface
  utils/       datas, busca, estatísticas, backup, PIN/biometria, .ics, demonstração
  theme/       folha de estilo única com as variáveis de cor e tipografia
```

---

## Rodando

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm run build      # gera dist/
npm run preview    # serve dist/
npm run typecheck
```

## Gerando o aplicativo Android

O projeto nativo já está em `android/`, com ícones e tela de abertura próprios.

```bash
npm run cap:sync          # build + copia dist/ para o projeto Android
npm run android:open      # abre no Android Studio
```

Para gerar o APK pela linha de comando, com o Android SDK instalado e
`ANDROID_HOME` configurado:

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# android/app/build/outputs/apk/debug/app-debug.apk
```

Para publicar, gere um keystore próprio e use `./gradlew assembleRelease`.

Se preferir recriar o projeto nativo do zero: `npx cap add android`.

### Instalar como aplicativo sem Android Studio

`dist/` também é um PWA instalável: sirva a pasta por HTTPS e use “Adicionar à tela inicial”
no Chrome do Android. Funciona offline e guarda os dados da mesma forma.

---

## Privacidade

- Armazenamento local no próprio aparelho (IndexedDB), incluindo os arquivos anexados.
- Nenhum registro é enviado para servidores; o aplicativo não faz requisições de rede.
- Nenhuma conta, nenhum identificador, nenhuma telemetria.
- O backup é gerado por você e fica onde você escolher.
