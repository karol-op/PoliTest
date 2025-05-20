## Prosta aplikacja do tworzenia quizów jedno/wielokrotnego wyboru.
Krótka historia: aplikacja wzorowana na [TestownikuPWR](https://github.com/TestownikiPWR), nie miał on wielu funkcji które były dla mnie niezbędne więc postanowiłem napisać od zera PoliTest ;)
<br>
Funkcje aplikacji:
* Kreator/edytor pytań, nie trzeba ręcznie tworzyć plików .txt, nazwy plików generowane na podstawie treści pytania
* Obsługa zdjęć, można je dodawać do pytania/dowolnej odpowiedzi, automatycznie kopiowane do pliku z testem
* Obsługa wyjaśnień do pytań/odpowiedzi (wyjaśnienia do pytania pojawiają się przed udzieleniem odpowiedzi, wyjaśnienia do odpowiedzi pojawiają się po udzieleniu odpowiedzi)
* Quiz, możliwość ustawienia dodatkowych powtórzeń przy błędnej odpowiedzi, wstępnych powtórzeń, maksymalnej liczba powtórzeń, losowa kolejność pytań oraz odpowiedzi, możliwość powrotu do poprzednich pytań, mechanizm opanowywania pytań, wiele statystyk po zakończeniu quizu (np. najtrudniejsze pytania, średni czas na odpowiedź)
* Zapisywanie postępów quizów, ustawień
* Scalanie folderów (automatyczne kopiowanie, rozpoznawanie duplikatów nazw oraz ich odpowiednia modyfikacja)
* Eksport pytań do PDF, wyjaśnienia oraz poprawność odpowiedzi można odpowiednio włączyć/wyłączyć
* Skróty klawiszowe:
  * W kreatorze pytań:
    * Ctrl+D - Dodaje nową odpowiedź
    * Enter - Zapisuje pytanie
    * Strzałki ↑/↓ w polu odpowiedzi - Nawigacja między polami
    * Ctrl+1-9 - Zaznacza odpowiedź jako poprawną o danym numerze (1-9)
    * Ctrl+Backspace w pustym polu - Usuwa odpowiedź 
    * Ctrl+W - dodanie wyjaśnienia do pytania/odpowiedzi
  * Podczas quizu:
    * 1-9 - wybiera odpowiedź
    * Enter - zatwierdza odpowiedzi
    * Strzałka w lewo - poprzednie pytanie
    * Strzałka w prawo - następne pytanie
