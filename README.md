# Relicário

Um arquivo pessoal e privado de afeto, palavras e memórias. **Versão 2.0.**

Relicário guarda o que alguém lhe disse, o que alguém fez, as cartas, as fotografias e os
pequenos acontecimentos que costumam se perder em conversas e galerias. Tudo fica no próprio
aparelho: não existe conta, servidor nem sincronização.

---

## O que está implementado

### Segunda etapa (2.0)

| Área | Situação |
| --- | --- |
| Recebimento por compartilhamento do Android | intent filters SEND/SEND_MULTIPLE, plugin nativo que copia os Content URIs para o armazenamento privado e fila persistente em disco |
| Caixa de Entrada | com contador na barra inferior, organização em lote e nada apagado automaticamente |
| Coleções personalizadas | nome, descrição, capa, cor, ícone; uma memória em várias coleções, sem duplicar arquivos |
| Calendário de memórias | navegação por mês e ano, dias marcados com contagem, integrado à mesma busca e filtros da linha do tempo |
| Precisão temporal | dia exato, mês e ano, só o ano, data aproximada e data desconhecida — guardadas e exibidas sem inventar o que falta |
| Origem do registro | lista editável; preenchida sozinha só quando o pacote de quem compartilhou é reconhecido |
| Histórico das memórias | o que mudou e quando, com restauração do valor anterior |
| Lixeira | retenção de 30 dias, prazo visível, restauração com anexos, exclusão definitiva confirmada |
| Backup v2 | manifesto com SHA-256 por anexo, verificação antes de restaurar, restauração atômica, mesclagem ou substituição |
| Backup criptografado | AES-256-GCM com chave derivada por PBKDF2-SHA256 (310 mil iterações, salt aleatório) |
| Verificação de integridade | registros incompletos, referências quebradas, anexos ausentes, arquivos órfãos, conferência byte a byte opcional |
| Busca avançada | inclui coleções, origem, nome de arquivo e o texto extraído de PDFs e arquivos de texto |
| Notificações locais | hoje no passado, cápsulas e lembretes, com controle de privacidade do conteúdo |
| Widget Android | widget real da tela inicial, com modo discreto que não revela nada |
| Quatro temas + cores próprias | Relicário, Herbário, Candeia, Porcelana e paleta personalizada com conferência de contraste |
| Tipografia e acessibilidade | quatro tamanhos de letra, rótulos acessíveis, áreas de toque e movimento reduzido |
| Preferências de visualização | densidade da lista, estilo dos cartões, colunas da galeria, ordem padrão, seções da tela inicial |
| Migração de banco versionada | v1 → v2 apenas acrescenta stores; nenhuma linha antiga é reescrita |

### Primeira etapa (1.0), preservada

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

- **Compartilhamento, notificações e widget exigem o aplicativo Android instalado.** O código
  nativo está no repositório e compila no APK; no navegador esses recursos aparecem como
  indisponíveis, com o motivo, em vez de simulados.
- **Compartilhamento e widget não foram testados num aparelho real** neste ambiente (não há
  emulador nem dispositivo). O que foi verificado: o APK compila, os intent filters
  `SEND`/`SEND_MULTIPLE` e o `receiver` do widget estão presentes no manifesto empacotado.
- **A biometria depende do aparelho** (WebAuthn com autenticador de plataforma). Quando não há
  suporte, a opção aparece desativada e explica o motivo; o PIN continua funcionando.
- **O PIN não entra no backup** e não pode ser recuperado se esquecido. A senha de um backup
  criptografado também não: sem ela o arquivo é irrecuperável.
- **Não há OCR.** O texto é extraído de PDFs que já contêm camada de texto e de arquivos de
  texto, localmente. Imagens e digitalizações não são processadas.
- **Imagens não são recomprimidas.** O gerenciamento de armazenamento mostra os arquivos
  maiores e os órfãos, mas não substitui nenhum original automaticamente.
- Os dados de demonstração são opcionais, ficam marcados e podem ser removidos de uma vez sem
  tocar nos registros reais (Configurações → Armazenamento).

---

## Tecnologia

- React 18 + TypeScript + Vite
- IndexedDB como banco local (sem dependências de ORM), com anexos guardados como `Blob`
- `fflate` para gerar e ler os backups `.zip`
- `pdfjs-dist` carregado sob demanda, só quando há um PDF para indexar
- `@capacitor/local-notifications` para as notificações locais
- WebCrypto do aparelho para PBKDF2, AES-GCM e SHA-256 — nenhum algoritmo próprio
- Capacitor 6 para empacotar como aplicativo Android nativo
- Nenhuma chamada de rede em tempo de execução

### Estrutura

```
src/
  db/          tipos, IndexedDB versionado, operações do arquivo, categorias e origens
  state/       Archive, Theme, Share, Lock e Ui — os contextos que sustentam o app
  screens/     uma tela por rota
  components/  cartões, anexos, filtros, calendário, histórico, leitor e primitivos
  utils/       datas, busca indexada, estatísticas, backup, criptografia, hash,
               integridade, extração de texto, notificações, ponte nativa, cores
  theme/       base.css (estrutura, sem nenhuma cor literal) + themes.css (tokens)
android/
  .../SharedIntakeStore.java     recebe e persiste o conteúdo compartilhado
  .../RelicarioNativePlugin.java ponte Capacitor: compartilhamentos e widget
  .../RelicarioWidget.java       widget real da tela inicial
```

### Como os temas funcionam

`base.css` não contém **nenhuma cor literal** — tudo vem de tokens (`--paper`, `--ink`,
`--accent`…) definidos por tema e por modo em `themes.css`. Trocar de tema troca só esse
conjunto de variáveis, e a mudança alcança toda a interface, inclusive diálogos, calendário,
gráficos e estados vazios. O tema personalizado injeta os mesmos tokens em `<html>`, derivando
automaticamente os valores secundários (contraste do texto sobre a cor principal, bordas fortes,
cores das categorias).

---

## Rodando

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:5173
npm run build      # gera dist/
npm run preview    # serve dist/
npm run typecheck
```

## Testando as novas funcionalidades

- **Compartilhamento:** instale o APK, abra o WhatsApp (ou qualquer app), compartilhe uma
  mensagem ou arquivo e escolha “Guardar no Relicário”. O conteúdo aparece em **Entrada**.
  Feche e reabra o aplicativo antes de organizar: os arquivos continuam lá, porque foram
  copiados para o armazenamento privado em vez de ficarem presos a uma URI temporária.
- **Datas:** no formulário, o seletor “Quando isso aconteceu” muda o campo seguinte. Escolha
  “Mês e ano” e confira no **Calendário**: o registro aparece no bloco “Sem dia exato”, não numa
  casa do mês.
- **Backup criptografado:** Configurações → Backup → “Proteger com senha”. Para testar a
  recuperação, escolha o arquivo `.relicario` gerado e digite uma senha errada primeiro.
- **Temas:** Configurações → Aparência. “Personalizar minhas cores” mostra a interface mudando
  enquanto você edita, e avisa quando uma combinação fica difícil de ler.
- **Lixeira e histórico:** exclua uma memória, restaure-a em Configurações → Lixeira, depois
  abra “Histórico deste registro” na memória.

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
