// Polish catalog, area 'privacy': the same keys and {params} as en/privacy.js.
export default {
  // ---- Settings > Farm (ui/privacy.js)
  'privacy.title': 'Prywatność',
  'privacy.row': 'Twoje dane',
  'privacy.link': 'Przeczytaj informację o prywatności',
  'privacy.help.multi': 'Co ta strona o tobie przechowuje, jak długo i jak poprosić o kopię lub usunięcie.',
  'privacy.help.single': 'Ten serwer trzyma twoją farmę na własnym komputerze; nic nie trafia nigdzie indziej, chyba że użyjesz pomocnika.',
  'privacy.delete.row': 'Usuń tę farmę',
  'privacy.delete.button': 'Usuń tę farmę teraz…',
  'privacy.delete.help': 'Wszystko na niej znika od razu, dla obojga farmerów. Tego nie da się cofnąć.',
  // ---- the confirm (ui/dialogs.js confirm: "Keep my farm" has the focus)
  'privacy.delete.confirm.title': 'Usunąć tę farmę?',
  'privacy.delete.confirm.lead': 'Wszystko na farmie „{farm}” zniknie, dla obojga farmerów.',
  'privacy.delete.confirm.leadNoName': 'Wszystko na tej farmie zniknie, dla obojga farmerów.',
  'privacy.delete.confirm.body': 'Pola, zwierzęta, budynki, obaj farmerzy z całym postępem i wszystkie kopie zapasowe zostaną usunięte od razu. Nikt nie może ich przywrócić, nawet my.',
  'privacy.delete.confirm.ok': 'Usuń na zawsze',
  'privacy.delete.confirm.cancel': 'Zachowaj farmę',
  'privacy.delete.confirm.fine': 'Jeśli twój partner właśnie gra, zobaczy na ekranie, że farma została usunięta.',
  'privacy.delete.err.AUTH': 'To urządzenie nie może usunąć tej farmy. Najpierw otwórz swój osobisty link do farmy.',
  'privacy.delete.err.RATE': 'Z tej sieci usunięto właśnie wiele farm. Spróbuj ponownie trochę później.',
  'privacy.delete.err.NET': 'Farma nie odpowiedziała, więc nic nie zostało usunięte. Spróbuj za chwilę.',
  // ---- the gate of a deleted farm, and every gate's privacy link (ui/farm-gate.js)
  'privacy.gate.deleted.title': 'Ta farma została usunięta',
  'privacy.gate.deleted.lead': 'Jeden z farmerów usunął ją razem ze wszystkim, co na niej było. Dziękujemy za wspólne gospodarowanie! Nowa farma to jedno dotknięcie.',
  'privacy.gate.link': 'Prywatność',
  // ---- the privacy page's script (js/privacy.js; the page's own text is public/privacy.html, in both languages)
  'privacy.page.err.kind': 'Wybierz, czego potrzebujesz.',
  'privacy.page.err.short': 'Jeszcze kilka słów, proszę: co najmniej {min} znaków.',
  'privacy.page.err.long': 'To ponad {max} znaków. Możesz to trochę skrócić?',
  'privacy.page.err.contact': 'Kontakt do {max} znaków, proszę.',
  'privacy.page.sending': 'Wysyłamy…',
  'privacy.page.send': 'Wyślij prośbę',
  'privacy.page.err.RATE': 'Za dużo próśb z tej sieci w tej chwili. Spróbuj ponownie trochę później.',
  'privacy.page.err.FULL': 'Za dużo próśb na dziś. Spróbuj ponownie jutro.',
  'privacy.page.err.BAD': 'Coś w formularzu jest nie tak. Sprawdź go i spróbuj ponownie.',
  'privacy.page.err.NET': 'Serwer nie odpowiedział. Twój tekst wciąż tu jest: spróbuj za chwilę.',
};
