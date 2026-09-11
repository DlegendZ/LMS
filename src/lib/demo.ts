// Demo mode: an in-browser mock of the Express backend, used for the
// GitHub Pages build (`npm run build:demo`). It plugs in as an axios adapter,
// so services and pages run unchanged. Business rules mirror the backend
// services and the PostgreSQL triggers in DATABASE_DDL.txt.
import { AxiosError } from "axios";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import type { Book, BorrowRecord, Category, Role, User } from "@/types/api";

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@library.demo" },
  { label: "Librarian", email: "librarian@library.demo" },
  { label: "Member", email: "member@library.demo" },
];

const DAY = 86_400_000;
const LOAN_DAYS = 14;
const BORROW_LIMIT = 3;
const FINE_BLOCK_LIMIT = 100_000;
const STORE_KEY = "lms-demo-store";
const SESSION_KEY = "lms-demo-session";

interface DemoUser extends User {
  password: string;
}

interface DemoBook extends Omit<Book, "c_name" | "c_description"> {
  b_is_deleted: boolean;
}

type DemoBorrow = Omit<
  BorrowRecord,
  "u_full_name" | "u_email" | "b_title" | "b_author" | "b_isbn"
>;

interface DemoFine {
  fine_id: number;
  borrow_id: number;
  fr_amount: number;
  fr_paid_amount: number;
  fr_status: "unpaid" | "partial" | "paid" | "waived";
  fr_created_at: string;
  fr_paid_at: string | null;
}

interface Store {
  roles: Role[];
  users: DemoUser[];
  categories: Category[];
  books: DemoBook[];
  borrows: DemoBorrow[];
  fines: DemoFine[];
}

// ---------------------------------------------------------------------------
// Seed data (dates are relative to "now" so due dates always look current)
// ---------------------------------------------------------------------------

const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY).toISOString();

// Same formula as returning_book_fn(): Rp 10.000 base + Rp 10.000 per late day
const fineAmount = (dueAt: string, returnedAt: string) => {
  const lateDays = Math.floor(
    (new Date(returnedAt).getTime() - new Date(dueAt).getTime()) / DAY,
  );
  return lateDays * 10_000 + 10_000;
};

const createSeed = (): Store => {
  const roles: Role[] = [
    { role_id: 1, r_name: "admin", r_description: "manages users, books, rules, and full system access" },
    { role_id: 2, r_name: "librarian", r_description: "handles book operations and member borrowing" },
    { role_id: 3, r_name: "member", r_description: "searches, borrows, and returns books" },
  ];

  const user = (
    user_id: number,
    role_id: number,
    u_full_name: string,
    u_email: string,
    createdDaysAgo: number,
    u_status: User["u_status"] = "active",
  ): DemoUser => ({
    user_id,
    role_id,
    u_full_name,
    u_email,
    u_status,
    u_created_at: daysAgo(createdDaysAgo),
    password: DEMO_PASSWORD,
  });

  const users: DemoUser[] = [
    user(1, 1, "Nadia Hartono", "admin@library.demo", 180),
    user(2, 2, "Budi Santoso", "librarian@library.demo", 170),
    user(3, 2, "Clara Wijaya", "clara.w@library.demo", 120),
    user(4, 3, "Dimas Saputra", "member@library.demo", 90),
    user(5, 3, "Eka Lestari", "eka.l@library.demo", 85),
    user(6, 3, "Farhan Hakim", "farhan.h@library.demo", 80),
    user(7, 3, "Gita Maharani", "gita.m@library.demo", 70),
    user(8, 3, "Hendra Gunawan", "hendra.g@library.demo", 65, "suspended"),
    user(9, 3, "Intan Permata", "intan.p@library.demo", 30),
  ];

  const categories: Category[] = [
    { category_id: 1, c_name: "Fiction", c_description: "Novels, short stories and literary classics" },
    { category_id: 2, c_name: "Science", c_description: "Physics, biology and the natural sciences" },
    { category_id: 3, c_name: "Technology", c_description: "Programming, software engineering and computing" },
    { category_id: 4, c_name: "History", c_description: "World history and the story of civilisations" },
    { category_id: 5, c_name: "Business", c_description: "Management, strategy and entrepreneurship" },
    { category_id: 6, c_name: "Self-Development", c_description: "Productivity, psychology and personal growth" },
  ];

  const book = (
    book_id: number,
    category_id: number,
    b_isbn: string,
    b_title: string,
    b_author: string,
    b_total_copies: number,
  ): DemoBook => ({
    book_id,
    category_id,
    b_isbn,
    b_title,
    b_author,
    b_total_copies,
    b_available_copies: b_total_copies,
    b_status: "available",
    b_is_deleted: false,
  });

  const books: DemoBook[] = [
    book(1, 1, "9780061120084", "To Kill a Mockingbird", "Harper Lee", 5),
    book(2, 1, "9780451524935", "1984", "George Orwell", 4),
    book(3, 1, "9780743273565", "The Great Gatsby", "F. Scott Fitzgerald", 3),
    book(4, 2, "9780553380163", "A Brief History of Time", "Stephen Hawking", 3),
    book(5, 2, "9780198788607", "The Selfish Gene", "Richard Dawkins", 2),
    book(6, 3, "9780132350884", "Clean Code", "Robert C. Martin", 4),
    book(7, 3, "9780201616224", "The Pragmatic Programmer", "Andrew Hunt", 3),
    book(8, 3, "9780262033848", "Introduction to Algorithms", "Thomas H. Cormen", 2),
    book(9, 4, "9780062316097", "Sapiens", "Yuval Noah Harari", 5),
    book(10, 4, "9780393354324", "Guns, Germs, and Steel", "Jared Diamond", 2),
    book(11, 5, "9780307887894", "The Lean Startup", "Eric Ries", 3),
    book(12, 5, "9780066620992", "Good to Great", "Jim Collins", 2),
    book(13, 6, "9780735211292", "Atomic Habits", "James Clear", 6),
    book(14, 6, "9781455586691", "Deep Work", "Cal Newport", 2),
    book(15, 6, "9780374533557", "Thinking, Fast and Slow", "Daniel Kahneman", 3),
    book(16, 1, "9780547928227", "The Hobbit", "J.R.R. Tolkien", 1),
  ];

  // [borrow_id, user_id, book_id, borrowed days ago, returned days ago | null]
  const borrowSeed: [number, number, number, number, number | null][] = [
    [1, 4, 6, 5, null],
    [2, 4, 9, 20, null],
    [3, 4, 2, 40, 22],
    [4, 4, 4, 35, 18],
    [5, 5, 16, 3, null],
    [6, 5, 13, 25, 10],
    [7, 6, 7, 8, null],
    [8, 6, 1, 30, 20],
    [9, 7, 11, 2, null],
    [10, 7, 3, 50, 28],
    [11, 8, 10, 60, 25],
    [12, 9, 13, 1, null],
    [13, 6, 14, 45, 29],
    [14, 4, 15, 60, 50],
  ];

  const borrows: DemoBorrow[] = borrowSeed.map(
    ([borrow_id, user_id, book_id, borrowed, returned]) => {
      const br_due_at = daysAgo(borrowed - LOAN_DAYS);
      const br_returned_at = returned === null ? undefined : daysAgo(returned);
      const late =
        br_returned_at !== undefined &&
        new Date(br_due_at) < new Date(br_returned_at);
      return {
        borrow_id,
        user_id,
        book_id,
        br_borrowed_at: daysAgo(borrowed),
        br_due_at,
        br_returned_at,
        br_status: br_returned_at === undefined ? "borrowed" : late ? "overdue" : "returned",
      };
    },
  );

  // [fine_id, borrow_id, paid amount, status]
  const fineSeed: [number, number, number, DemoFine["fr_status"]][] = [
    [1, 4, 20_000, "partial"],
    [2, 6, 20_000, "paid"],
    [3, 10, 0, "unpaid"],
    [4, 11, 0, "unpaid"],
    [5, 13, 0, "waived"],
    [6, 3, 0, "unpaid"],
  ];

  const fines: DemoFine[] = fineSeed.map(
    ([fine_id, borrow_id, fr_paid_amount, fr_status]) => {
      const borrow = borrows.find((b) => b.borrow_id === borrow_id)!;
      return {
        fine_id,
        borrow_id,
        fr_amount: fineAmount(borrow.br_due_at, borrow.br_returned_at!),
        fr_paid_amount,
        fr_status,
        fr_created_at: borrow.br_returned_at!,
        fr_paid_at: fr_status === "paid" ? borrow.br_returned_at! : null,
      };
    },
  );

  // Active loans reduce available copies (borrow_book_tg)
  for (const b of borrows) {
    if (b.br_status === "borrowed") {
      const target = books.find((bk) => bk.book_id === b.book_id)!;
      target.b_available_copies -= 1;
    }
  }
  for (const b of books) {
    b.b_status = b.b_available_copies === 0 ? "unavailable" : "available";
  }

  return { roles, users, categories, books, borrows, fines };
};

// ---------------------------------------------------------------------------
// Persistence (per tab, so every visitor starts from the same seed)
// ---------------------------------------------------------------------------

const readStorage = <T>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: unknown) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: demo still works, it just won't survive a reload
  }
};

const store: Store = readStorage<Store>(STORE_KEY) ?? createSeed();

type Session = { user_id: number; role_id: number };
let session: Session | null = readStorage<Session>(SESSION_KEY);

const setSession = (value: Session | null) => {
  session = value;
  writeStorage(SESSION_KEY, value);
};

// ---------------------------------------------------------------------------
// Helpers mirroring the backend's joined SELECT * queries
// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const forbidden = (message: string) => new HttpError(403, message);
const nextId = (rows: object[], key: string) =>
  Math.max(0, ...rows.map((r) => (r as Record<string, number>)[key])) + 1;
const nowIso = () => new Date().toISOString();
// Backend returns `null` (not []) when a query has no rows
const rowsOrNull = <T>(rows: T[]) => (rows.length ? rows : null);

const publicUser = ({ password: _password, ...rest }: DemoUser): User => rest;

const findUser = (id: number) => store.users.find((u) => u.user_id === id);
const findBook = (id: number) => store.books.find((b) => b.book_id === id);
const findBorrow = (id: number) =>
  store.borrows.find((b) => b.borrow_id === id);

const bookRow = (book: DemoBook) => {
  const category = store.categories.find(
    (c) => c.category_id === book.category_id,
  );
  return { ...book, c_name: category?.c_name, c_description: category?.c_description };
};

const borrowRow = (borrow: DemoBorrow) => ({
  ...publicUser(findUser(borrow.user_id)!),
  ...findBook(borrow.book_id)!,
  ...borrow,
});

const fineRow = (fine: DemoFine) => ({
  ...borrowRow(findBorrow(fine.borrow_id)!),
  ...fine,
});

const activeBooks = () => store.books.filter((b) => !b.b_is_deleted);

const setAvailableCopies = (book: DemoBook, copies: number) => {
  book.b_available_copies = copies;
  // book_availability_tg
  book.b_status = copies === 0 ? "unavailable" : "available";
};

type Body = Record<string, unknown>;

const registerUser = (role_id: number, body: Body) => {
  const full_name = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!full_name || !email || password.length < 8)
    throw new HttpError(400, "Name, email and a password of at least 8 characters are required.");
  if (store.users.some((u) => u.u_email === email))
    throw new HttpError(409, "Email is already registered.");

  const created: DemoUser = {
    user_id: nextId(store.users, "user_id"),
    role_id,
    u_full_name: full_name,
    u_email: email,
    u_status: "active",
    u_created_at: nowIso(),
    password,
  };
  store.users.push(created);
  return [publicUser(created)];
};

const bookFields = (body: Body) => {
  const total = Number(body.total_copies);
  const available = Number(body.available_copies);
  const isbn = String(body.isbn ?? "");
  if (!/^\d{13}$/.test(isbn)) throw new HttpError(400, "ISBN must be 13 digits.");
  if (!Number.isInteger(total) || total < 1)
    throw new HttpError(400, "Total copies must be at least 1.");
  if (!Number.isInteger(available) || available < 0 || available > total)
    throw new HttpError(400, "Available copies must be between 0 and total copies.");
  return {
    category_id: Number(body.category_id),
    b_isbn: isbn,
    b_title: String(body.title ?? ""),
    b_author: String(body.author ?? ""),
    b_total_copies: total,
    b_available_copies: available,
  };
};

const addBook = (body: Body) => {
  const fields = bookFields(body);
  if (store.books.some((b) => b.b_isbn === fields.b_isbn))
    throw new HttpError(409, "A book with this ISBN already exists.");
  const created: DemoBook = {
    book_id: nextId(store.books, "book_id"),
    ...fields,
    b_status: "available",
    b_is_deleted: false,
  };
  store.books.push(created);
  return [created];
};

const updateBook = (bookId: number, body: Body) => {
  const book = findBook(bookId);
  if (!book) return null;
  const { b_available_copies, ...fields } = bookFields(body);
  const copiesChanged = b_available_copies !== book.b_available_copies;
  Object.assign(book, fields, {
    b_status: body.status === "unavailable" ? "unavailable" : "available",
  });
  if (copiesChanged) setAvailableCopies(book, b_available_copies);
  return [book];
};

const payFine = (borrowId: number, body: Body) => {
  const amount = Number(body.amount);
  if (!(amount > 0)) throw new HttpError(400, "Amount must be greater than 0.");
  const fine = store.fines.find((f) => f.borrow_id === borrowId);
  if (!fine) return null;
  fine.fr_paid_amount += amount;
  // fine_payment_tg
  if (fine.fr_amount > fine.fr_paid_amount) {
    fine.fr_status = "partial";
  } else {
    fine.fr_status = "paid";
    fine.fr_paid_at = nowIso();
  }
  return [fine];
};

const borrowBook = (userId: number, body: Body) => {
  const bookId = Number(body.book_id);
  const user = findUser(userId)!;
  if (user.u_status === "suspended")
    throw forbidden("User is suspended and cannot borrow books");

  const active = store.borrows.filter(
    (b) => b.user_id === userId && b.br_status === "borrowed",
  );
  if (active.length >= BORROW_LIMIT)
    throw forbidden(`Borrow limit exceeded. Maximum allowed is ${BORROW_LIMIT} books.`);

  const book = findBook(bookId);
  if (!book) throw forbidden("Book not found");
  if (book.b_status === "unavailable")
    throw forbidden("Book is unavailable and cannot be borrowed.");
  if (active.some((b) => b.book_id === bookId))
    throw forbidden("The same book cannot be borrowed more than once at the same time.");

  const outstanding = store.fines
    .filter(
      (f) =>
        (f.fr_status === "unpaid" || f.fr_status === "partial") &&
        findBorrow(f.borrow_id)?.user_id === userId,
    )
    .reduce((sum, f) => sum + f.fr_amount - f.fr_paid_amount, 0);
  if (outstanding > FINE_BLOCK_LIMIT)
    throw forbidden(
      "Borrowing is not allowed because outstanding fines exceed the permitted limit.",
    );

  const created: DemoBorrow = {
    borrow_id: nextId(store.borrows, "borrow_id"),
    user_id: userId,
    book_id: bookId,
    br_borrowed_at: nowIso(),
    br_due_at: new Date(Date.now() + LOAN_DAYS * DAY).toISOString(),
    br_status: "borrowed",
  };
  store.borrows.push(created);
  setAvailableCopies(book, book.b_available_copies - 1);
  return [created];
};

const returnBook = (userId: number, borrowId: number) => {
  const borrow = findBorrow(borrowId);
  if (!borrow || borrow.user_id !== userId) return null;
  if (borrow.br_returned_at) return [borrow];

  // returning_book_tg
  borrow.br_returned_at = nowIso();
  if (new Date(borrow.br_due_at) < new Date(borrow.br_returned_at)) {
    store.fines.push({
      fine_id: nextId(store.fines, "fine_id"),
      borrow_id: borrow.borrow_id,
      fr_amount: fineAmount(borrow.br_due_at, borrow.br_returned_at),
      fr_paid_amount: 0,
      fr_status: "unpaid",
      fr_created_at: borrow.br_returned_at,
      fr_paid_at: null,
    });
    borrow.br_status = "overdue";
  } else {
    borrow.br_status = "returned";
  }
  const book = findBook(borrow.book_id);
  if (book) setAvailableCopies(book, book.b_available_copies + 1);
  return [borrow];
};

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

type Params = Record<string, string | undefined>;
type Handler = (ctx: {
  body: Body;
  params: Params;
  id: number;
  user: Session;
}) => unknown;

const ROLE_BY_PREFIX: Record<string, number> = { admin: 1, librarian: 2, member: 3 };

// "METHOD /path/:id" -> handler; `:id` is parsed as a number
const routes: Record<string, Handler> = {
  // Admin
  "GET /admin/users": ({ params }) =>
    rowsOrNull(
      store.users
        .filter((u) => !params.status || u.u_status === params.status)
        .map(publicUser),
    ),
  "PUT /admin/users/:id": ({ id, body }) => {
    const user = findUser(id);
    if (!user) return null;
    if (body.role_id) user.role_id = Number(body.role_id);
    else if (body.status) user.u_status = body.status as User["u_status"];
    return [publicUser(user)];
  },
  "GET /admin/roles": () => store.roles,
  "POST /admin/admins": ({ body }) => registerUser(1, body),
  "POST /admin/librarians": ({ body }) => registerUser(2, body),
  "GET /admin/books": () => rowsOrNull(activeBooks().map(bookRow)),
  "POST /admin/books": ({ body }) => addBook(body),
  "PUT /admin/books/:id": ({ id, body }) => updateBook(id, body),
  "DELETE /admin/books/:id": ({ id }) => {
    if (store.borrows.some((b) => b.book_id === id && b.br_status === "borrowed"))
      throw forbidden("Book cannot be deleted because it is currently borrowed.");
    const book = findBook(id);
    if (!book) return null;
    book.b_is_deleted = true;
    return [book];
  },
  "GET /admin/categories": () => rowsOrNull(store.categories),
  "POST /admin/categories": ({ body }) => {
    const c_name = String(body.name ?? "").trim();
    if (!c_name) throw new HttpError(400, "Category name is required.");
    if (store.categories.some((c) => c.c_name.toLowerCase() === c_name.toLowerCase()))
      throw new HttpError(409, "Category already exists.");
    const created: Category = {
      category_id: nextId(store.categories, "category_id"),
      c_name,
      c_description: String(body.description ?? ""),
    };
    store.categories.push(created);
    return [created];
  },
  "GET /admin/borrow-records": ({ params }) =>
    rowsOrNull(
      store.borrows
        .filter((b) => !params.status || b.br_status === params.status)
        .map(borrowRow),
    ),
  "GET /admin/members/:id/borrow-records": ({ id }) =>
    rowsOrNull(store.borrows.filter((b) => b.user_id === id).map(borrowRow)),
  "GET /admin/fine-records": ({ params }) =>
    rowsOrNull(
      store.fines
        .filter((f) => !params.status || f.fr_status === params.status)
        .map(fineRow),
    ),
  "PUT /admin/fine-records/:id": ({ id, body }) => payFine(id, body),

  // Librarian
  "GET /librarian/members": () =>
    rowsOrNull(store.users.filter((u) => u.role_id === 3).map(publicUser)),
  "POST /librarian/members": ({ body }) => registerUser(3, body),
  "GET /librarian/categories": () => rowsOrNull(store.categories),
  "POST /librarian/books": ({ body }) => addBook(body),
  "PUT /librarian/books/:id": ({ id, body }) => updateBook(id, body),
  "GET /librarian/borrow-records": () => rowsOrNull(store.borrows.map(borrowRow)),
  "GET /librarian/fine-records": () => rowsOrNull(store.fines.map(fineRow)),
  "PUT /librarian/fine-records/:id": ({ id, body }) => payFine(id, body),

  // Member
  "GET /member/books": ({ params }) => {
    const match = (value: string, query?: string) =>
      !query || value.toLowerCase().includes(query.toLowerCase());
    return rowsOrNull(
      activeBooks()
        .map(bookRow)
        .filter(
          (b) =>
            match(b.c_name ?? "", params.category_name) &&
            match(b.b_title, params.title) &&
            match(b.b_author, params.author),
        ),
    );
  },
  "POST /member/borrow-records": ({ user, body }) => borrowBook(user.user_id, body),
  "PUT /member/borrow-records/:id": ({ user, id }) => returnBook(user.user_id, id),
  "GET /member/borrow-records": ({ user }) =>
    rowsOrNull(
      store.borrows.filter((b) => b.user_id === user.user_id).map(borrowRow),
    ),
  "GET /member/fine-records": ({ user, params }) =>
    rowsOrNull(
      store.fines
        .filter(
          (f) =>
            findBorrow(f.borrow_id)?.user_id === user.user_id &&
            (!params.status || f.fr_status === params.status),
        )
        .map(fineRow),
    ),
};

const matchRoute = (method: string, path: string) => {
  const segments = path.split("/").filter(Boolean);
  for (const [key, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = key.split(" ");
    const routeSegments = routePath.split("/").filter(Boolean);
    if (routeMethod !== method || routeSegments.length !== segments.length) continue;
    let id = NaN;
    const ok = routeSegments.every((seg, i) => {
      if (seg === ":id") {
        id = Number(segments[i]);
        return Number.isInteger(id);
      }
      return seg === segments[i];
    });
    if (ok) return { handler, id };
  }
  return null;
};

const handleAuth = (path: string, body: Body): [number, unknown] => {
  switch (path) {
    case "/auth/login": {
      const email = String(body.email ?? "").trim().toLowerCase();
      const user = store.users.find((u) => u.u_email === email);
      if (!user || user.password !== body.password)
        return [401, { message: "Invalid email or password" }];
      setSession({ user_id: user.user_id, role_id: user.role_id });
      return [200, { message: "Login successful.", user: session }];
    }
    case "/auth/refresh":
      return session
        ? [200, { message: "New access token issued.", user: session }]
        : [401, { error: "Refresh token not found" }];
    case "/auth/logout":
      setSession(null);
      return [200, { message: "Logged out" }];
    default:
      return [404, { message: "Not found" }];
  }
};

const dispatch = (
  method: string,
  path: string,
  body: Body,
  params: Params,
): [number, unknown] => {
  if (path.startsWith("/auth/")) return handleAuth(path, body);

  const requiredRole = ROLE_BY_PREFIX[path.split("/")[1]];
  if (!session || session.role_id !== requiredRole)
    return [401, { message: "unauthorized" }];

  const route = matchRoute(method, path);
  if (!route) return [404, { message: "Not found" }];

  try {
    const data = route.handler({ body, params, id: route.id, user: session });
    if (method !== "GET") writeStorage(STORE_KEY, store);
    return [200, data];
  } catch (err) {
    if (err instanceof HttpError) return [err.status, { message: err.message }];
    return [500, { message: "Internal Server Error" }];
  }
};

const parseBody = (data: unknown): Body => {
  if (typeof data === "string" && data) {
    try {
      return JSON.parse(data) as Body;
    } catch {
      return {};
    }
  }
  return (data as Body) ?? {};
};

export const demoAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig,
) => {
  // Small delay so loading states behave like a real network call
  await new Promise((resolve) => setTimeout(resolve, 200));

  const url = new URL(config.url ?? "/", "http://demo.local");
  const params: Params = Object.fromEntries(url.searchParams);
  for (const [key, value] of Object.entries(config.params ?? {})) {
    if (value !== undefined && value !== null && value !== "")
      params[key] = String(value);
  }

  const method = (config.method ?? "get").toUpperCase();
  const [status, data] = dispatch(method, url.pathname, parseBody(config.data), params);

  const response: AxiosResponse = {
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
    request: {},
  };

  if (status >= 400) {
    const message =
      (data as { message?: string; error?: string })?.message ??
      (data as { error?: string })?.error ??
      "Request failed";
    throw new AxiosError(
      message,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      response.request,
      response,
    );
  }

  return response;
};
