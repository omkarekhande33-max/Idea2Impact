// Idea2Impact - Comprehensive Technical Skills & Dynamic Quiz Generator

export const SKILLS_CATALOG = [
  {
    id: "sk-cpp",
    slug: "cpp",
    name: "C++",
    full_name: "C++ (OOP & Systems)",
    category: "Languages",
    icon: "⚡",
    color: "#00599C",
    bg: "rgba(0, 89, 156, 0.12)",
    level: "Advanced",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "Object-oriented programming, pointers, references, RAII, STL containers, virtual destructors, and manual memory management."
  },
  {
    id: "sk-python",
    slug: "python",
    name: "Python",
    full_name: "Python & Backend Engineering",
    category: "Languages",
    icon: "🐍",
    color: "#3776AB",
    bg: "rgba(55, 118, 171, 0.12)",
    level: "Intermediate",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "Data structures, list comprehensions, decorators, generators, OOP, GIL, and asynchronous event loop operations."
  },
  {
    id: "sk-java",
    slug: "java",
    name: "Java",
    full_name: "Java & Enterprise Architecture",
    category: "Languages",
    icon: "☕",
    color: "#ED8B00",
    bg: "rgba(237, 139, 0, 0.12)",
    level: "Advanced",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "JVM architecture, OOP principles, interfaces vs abstract classes, collections framework, multithreading, and Streams API."
  },
  {
    id: "sk-js",
    slug: "js",
    name: "JavaScript",
    full_name: "JavaScript (ES6+) & Modern Web",
    category: "Web & Frontend",
    icon: "🟨",
    color: "#D97706",
    bg: "rgba(217, 119, 6, 0.12)",
    level: "Intermediate",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "Closures, Event Loop microtasks vs macrotasks, Promises, async/await, prototype chain, and modern ES6+ syntax."
  },
  {
    id: "sk-c",
    slug: "c",
    name: "C",
    full_name: "C Systems Programming",
    category: "Languages",
    icon: "⚙️",
    color: "#475569",
    bg: "rgba(71, 85, 105, 0.12)",
    level: "Advanced",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "Pointers and pointer arithmetic, heap allocation (malloc/free), structs, memory layouts, and bitwise operations."
  },
  {
    id: "sk-html",
    slug: "html",
    name: "HTML5",
    full_name: "HTML5 & Semantic Web",
    category: "Web & Frontend",
    icon: "🌐",
    color: "#EA580C",
    bg: "rgba(234, 88, 12, 0.12)",
    level: "Beginner",
    duration_minutes: 10,
    question_count: 5,
    passing_score: 75.0,
    description: "Semantic elements (article, nav, header), accessible forms, input validation, ARIA landmarks, and meta viewport."
  },
  {
    id: "sk-css",
    slug: "css",
    name: "CSS3",
    full_name: "CSS3 & Responsive Design",
    category: "Web & Frontend",
    icon: "🎨",
    color: "#2563EB",
    bg: "rgba(37, 99, 235, 0.12)",
    level: "Intermediate",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "CSS Grid, Flexbox, box model (border-box), specificity calculations, media queries, CSS variables, and keyframe animations."
  },
  {
    id: "sk-react",
    slug: "react",
    name: "React",
    full_name: "React.js & Component Architecture",
    category: "Web & Frontend",
    icon: "⚛️",
    color: "#0284C7",
    bg: "rgba(2, 132, 199, 0.12)",
    level: "Intermediate",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "Functional components, hooks (useState, useEffect, useMemo), Virtual DOM, reconciliation diffing, and state lifting."
  },
  {
    id: "sk-sql",
    slug: "sql",
    name: "SQL",
    full_name: "SQL & Relational Databases",
    category: "Databases & Tools",
    icon: "🗄️",
    color: "#0D9488",
    bg: "rgba(13, 148, 136, 0.12)",
    level: "Intermediate",
    duration_minutes: 15,
    question_count: 5,
    passing_score: 75.0,
    description: "Relational schemas, INNER/LEFT/OUTER JOINs, GROUP BY & HAVING, indexing, ACID transactions, and parameterized queries."
  },
  {
    id: "sk-git",
    slug: "git",
    name: "Git",
    full_name: "Git & Version Control",
    category: "Databases & Tools",
    icon: "🐙",
    color: "#DC2626",
    bg: "rgba(220, 38, 38, 0.12)",
    level: "Beginner",
    duration_minutes: 10,
    question_count: 5,
    passing_score: 75.0,
    description: "Branching workflows, rebasing vs merging, conflict resolution, cherry-picking, HEAD management, and git stash."
  }
];

export const QUIZ_BANKS = {
  cpp: {
    id: "asm-cpp",
    skill_id: "sk-cpp",
    title: "C++ Systems & OOP Technical Quiz",
    skill_name: "C++",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "cpp_q1",
        text: "What is the primary difference between a 'struct' and a 'class' in C++?",
        options: [
          "A class can have member functions, but a struct cannot",
          "Members and base classes are public by default in a struct, but private by default in a class",
          "A struct is always allocated on the stack, while a class is always allocated on the heap",
          "Classes support inheritance, but structs do not in C++"
        ],
        correct_index: 1,
        explanation: "In C++, the only semantic difference between struct and class is default access specification: public for struct, private for class."
      },
      {
        id: "cpp_q2",
        text: "Why must a polymorphic base class destructor almost always be declared as 'virtual' in C++?",
        options: [
          "To prevent memory leaks and undefined behavior by ensuring derived class destructors run when deleting via a base pointer",
          "To make the class pure abstract and prevent instantiation",
          "To allow the destructor to accept parameters",
          "To prevent the compiler from generating a default copy constructor"
        ],
        correct_index: 0,
        explanation: "Deleting an object through a base class pointer without a virtual destructor causes undefined behavior and resource leaks."
      },
      {
        id: "cpp_q3",
        text: "What programming idiom does modern C++ rely on where resource management is tied to object lifetime?",
        options: [
          "Garbage Collection (GC)",
          "Resource Acquisition Is Initialization (RAII)",
          "Lazy Evaluation Pipeline",
          "Singleton Allocation"
        ],
        correct_index: 1,
        explanation: "RAII ensures resources like heap memory, file handles, and mutex locks are released automatically when the holding object goes out of scope."
      },
      {
        id: "cpp_q4",
        text: "What is the key advantage of 'std::unique_ptr' over 'std::shared_ptr'?",
        options: [
          "std::unique_ptr has zero runtime overhead compared to a raw pointer and cannot be copied, guaranteeing single exclusive ownership",
          "std::unique_ptr can be shared across multiple threads simultaneously",
          "std::unique_ptr uses atomic reference counting",
          "std::unique_ptr cannot be moved"
        ],
        correct_index: 0,
        explanation: "std::unique_ptr enforces exclusive ownership with zero overhead (no control block or atomic reference counting)."
      },
      {
        id: "cpp_q5",
        text: "What happens when you pass a large std::vector into a function as 'void process(const std::vector<int>& vec)'?",
        options: [
          "A deep copy of all elements is allocated on the heap",
          "It is passed by constant reference without copying, preventing unnecessary allocations while preventing modification",
          "It causes a compilation error because vectors cannot be const",
          "The vector is moved and invalidated in the caller"
        ],
        correct_index: 1,
        explanation: "Passing by 'const std::vector<int>&' avoids deep copying large arrays while enforcing read-only semantics."
      }
    ]
  },
  python: {
    id: "asm-python",
    skill_id: "sk-python",
    title: "Python Architecture & Core Concepts Quiz",
    skill_name: "Python",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "py_q1",
        text: "What is the behavior of mutable default arguments in Python, e.g. 'def append_to(item, target=[])'?",
        options: [
          "A new empty list is created on every function call",
          "The same list instance is reused across multiple calls because default argument expressions are evaluated once at definition time",
          "Python raises a SyntaxError at runtime",
          "The list is garbage collected immediately upon function return"
        ],
        correct_index: 1,
        explanation: "Default arguments are evaluated once when the function definition is executed, so mutable objects like lists or dicts persist state across calls."
      },
      {
        id: "py_q2",
        text: "What is the primary function of the Global Interpreter Lock (GIL) in standard CPython?",
        options: [
          "To prevent multi-threaded network sockets",
          "A mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes concurrently",
          "To automatically compile Python to machine bytecode ahead of time",
          "To enforce typing discipline across imported modules"
        ],
        correct_index: 1,
        explanation: "CPython's GIL simplifies memory management by ensuring only one thread executes Python bytecode at a time."
      },
      {
        id: "py_q3",
        text: "How do generator functions using the 'yield' keyword differ from functions that return a list?",
        options: [
          "Generators produce items lazily on-demand one at a time, requiring O(1) memory instead of holding all items in memory",
          "Generators run on a separate CPU thread automatically",
          "Generators cannot be iterated over with a for loop",
          "Generators are slower and deprecated in Python 3.10+"
        ],
        correct_index: 0,
        explanation: "Generators compute elements lazily via the iterator protocol, resulting in huge memory savings for large datasets."
      },
      {
        id: "py_q4",
        text: "What does the '@functools.wraps(func)' decorator do when creating custom decorators?",
        options: [
          "It turns the decorated function into an async coroutine",
          "It preserves original metadata like __name__, __doc__, and annotations of the wrapped function",
          "It encrypts the bytecode of the function",
          "It makes the function run 2x faster"
        ],
        correct_index: 1,
        explanation: "functools.wraps copies the function name, docstring, and annotations from the original function to the wrapper."
      },
      {
        id: "py_q5",
        text: "Which built-in Python data structure provides average O(1) time complexity for lookup, insertion, and deletion?",
        options: [
          "list",
          "dict (and set)",
          "tuple",
          "collections.deque"
        ],
        correct_index: 1,
        explanation: "Python dicts and sets are implemented using hash tables, giving average O(1) key lookups, inserts, and deletes."
      }
    ]
  },
  java: {
    id: "asm-java",
    skill_id: "sk-java",
    title: "Java Core & Enterprise OOP Quiz",
    skill_name: "Java",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "java_q1",
        text: "What is the fundamental difference between '==' and '.equals()' when comparing objects in Java?",
        options: [
          "'==' compares object references (memory address), while '.equals()' tests for logical value equality (when overridden)",
          "'==' compares content, while '.equals()' compares memory address",
          "'==' only works on primitive integers",
          "There is no difference between them in modern Java"
        ],
        correct_index: 0,
        explanation: "The '==' operator checks if two references point to the exact same memory address, whereas equals() is overridden to compare meaningful content."
      },
      {
        id: "java_q2",
        text: "In Java 8+, what is a Functional Interface?",
        options: [
          "An interface with no methods at all",
          "An interface that contains exactly one abstract method, suitable as the assignment target for a lambda expression",
          "An interface that can only extend abstract classes",
          "A class marked with the 'final' keyword"
        ],
        correct_index: 1,
        explanation: "A functional interface has exactly one abstract method (annotated optionally with @FunctionalInterface) and can be instantiated via lambdas."
      },
      {
        id: "java_q3",
        text: "What does the 'volatile' keyword signify when declared on a Java field?",
        options: [
          "The variable cannot be changed once initialized",
          "Reads and writes go directly to main memory, ensuring changes made by one thread are immediately visible to all other threads",
          "The variable is stored on the call stack",
          "The variable is serialized automatically"
        ],
        correct_index: 1,
        explanation: "The volatile modifier prevents thread caching of variables in CPU registers, establishing a happens-before memory visibility guarantee."
      },
      {
        id: "java_q4",
        text: "What is the time complexity of retrieving a value by key in a well-distributed Java 'HashMap'?",
        options: [
          "O(n)",
          "O(log n)",
          "O(1) average time complexity",
          "O(n^2)"
        ],
        correct_index: 2,
        explanation: "HashMap computes hash buckets for keys, achieving average O(1) performance for get() and put() operations."
      },
      {
        id: "java_q5",
        text: "Which exception type in Java must either be declared in a method's 'throws' clause or caught in a 'try-catch' block?",
        options: [
          "Checked Exceptions (subclasses of java.lang.Exception excluding RuntimeException)",
          "Unchecked Exceptions (subclasses of RuntimeException)",
          "Errors (like OutOfMemoryError)",
          "AssertionError"
        ],
        correct_index: 0,
        explanation: "Checked exceptions are verified at compile-time and must be handled or declared in the method signature."
      }
    ]
  },
  js: {
    id: "asm-js",
    skill_id: "sk-js",
    title: "JavaScript (ES6+) Technical Quiz",
    skill_name: "JavaScript",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "js_q1",
        text: "What is a 'closure' in JavaScript?",
        options: [
          "A function bundled together with references to its surrounding lexical environment, allowing it to access outer variables even after the outer function has returned",
          "A method that closes an active network connection",
          "An IIFE (Immediately Invoked Function Expression) that returns undefined",
          "A technique to prevent object mutation using Object.freeze()"
        ],
        correct_index: 0,
        explanation: "A closure gives an inner function access to an outer function's scope even after the outer function has finished executing."
      },
      {
        id: "js_q2",
        text: "In the JavaScript Event Loop, which tasks have higher priority and run first after the current synchronous script completes?",
        options: [
          "Macrotasks (e.g., setTimeout, setInterval)",
          "Microtasks (e.g., Promise.then/catch/finally, queueMicrotask)",
          "DOM requestAnimationFrame callbacks",
          "Disk I/O event handlers"
        ],
        correct_index: 1,
        explanation: "The microtask queue is drained completely before the event loop picks the next macrotask from the task queue."
      },
      {
        id: "js_q3",
        text: "What is the difference between 'let'/'const' and 'var' regarding scoping in JavaScript?",
        options: [
          "'let' and 'const' are block-scoped and temporal dead zone (TDZ) aware, while 'var' is function-scoped and hoisted with undefined",
          "'var' is block-scoped, while 'let' is globally scoped",
          "'const' values can never have their internal object properties modified",
          "There is no difference in ES6+"
        ],
        correct_index: 0,
        explanation: "'let' and 'const' respect block boundaries ({ ... }) and cannot be accessed before declaration (Temporal Dead Zone)."
      },
      {
        id: "js_q4",
        text: "What does 'Promise.all([p1, p2, p3])' do if any one of the promises rejects?",
        options: [
          "It waits for all others to finish, then returns the successful values",
          "It immediately rejects with the reason of the first promise that rejected (fail-fast behavior)",
          "It silently ignores the error and returns null",
          "It converts the error into an undefined resolution"
        ],
        correct_index: 1,
        explanation: "Promise.all rejects immediately upon the first rejected promise; use Promise.allSettled if you need results for all promises regardless of outcome."
      },
      {
        id: "js_q5",
        text: "What is the value of 'typeof null' in JavaScript, and why?",
        options: [
          "'null'",
          "'undefined'",
          "'object' (a historic legacy bug in JS since its first implementation in 1995)",
          "'boolean'"
        ],
        correct_index: 2,
        explanation: "In JavaScript's initial implementation, values had a type tag where 0 represented an object reference, and null was represented as the NULL pointer (0x00)."
      }
    ]
  },
  c: {
    id: "asm-c",
    skill_id: "sk-c",
    title: "C Systems Programming & Memory Quiz",
    skill_name: "C",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "c_q1",
        text: "In C, what is the effect of calling 'free(ptr)' on dynamically allocated memory?",
        options: [
          "It frees the allocated block back to the heap manager, but the pointer variable 'ptr' still holds the address (becoming a dangling pointer)",
          "It sets 'ptr' to NULL automatically",
          "It zeroes out the contents of the memory before freeing",
          "It frees all other pointers that were referencing that memory"
        ],
        correct_index: 0,
        explanation: "free() releases the heap memory block, but does not modify the pointer variable itself; best practice is to set ptr = NULL immediately."
      },
      {
        id: "c_q2",
        text: "What happens in pointer arithmetic when you increment an 'int*' pointer (ptr++) on a 64-bit architecture where sizeof(int) is 4 bytes?",
        options: [
          "The pointer address increases by 1 byte",
          "The pointer address increases by 4 bytes (the size of the pointed-to type)",
          "The pointer address increases by 8 bytes",
          "The pointer address doubles"
        ],
        correct_index: 1,
        explanation: "Pointer arithmetic advances addresses by the size of the underlying type: ptr + 1 advances by sizeof(*ptr) bytes."
      },
      {
        id: "c_q3",
        text: "What is the difference between 'malloc()' and 'calloc()' in the C standard library?",
        options: [
          "'malloc' allocates uninitialized memory (contents are garbage), while 'calloc' zeroes out all allocated memory bytes",
          "'malloc' allocates memory on the stack, while 'calloc' allocates on the heap",
          "'calloc' can only allocate single primitive variables",
          "'malloc' automatically runs destructors"
        ],
        correct_index: 0,
        explanation: "calloc(n, size) initializes all allocated bytes to zero; malloc(bytes) leaves memory uninitialized."
      },
      {
        id: "c_q4",
        text: "What does the 'static' keyword do when applied to a global variable or function in a C source file?",
        options: [
          "It makes the variable thread-safe",
          "It restricts the visibility (linkage) to the translation unit (.c file) where it is defined, preventing name collisions across files",
          "It forces the compiler to place the variable in the CPU L1 cache",
          "It prevents the variable from being modified"
        ],
        correct_index: 1,
        explanation: "Static global variables and functions have internal linkage and cannot be accessed from other object files."
      },
      {
        id: "c_q5",
        text: "What is undefined behavior (UB) in C?",
        options: [
          "Code that always crashes with a segmentation fault",
          "Constructs where the C standard imposes no requirements; the compiler may generate any instructions, optimize away checks, or produce arbitrary results",
          "A syntax error caught by the preprocessor",
          "A memory allocation that exceeds 4GB"
        ],
        correct_index: 1,
        explanation: "Undefined behavior means the C specification does not define what should happen, allowing compilers to assume it never happens during optimization."
      }
    ]
  },
  html: {
    id: "asm-html",
    skill_id: "sk-html",
    title: "HTML5 & Semantic Web Quiz",
    skill_name: "HTML5",
    duration_minutes: 10,
    passing_score: 75.0,
    questions: [
      {
        id: "html_q1",
        text: "Why should developers use semantic HTML tags (<article>, <nav>, <header>, <main>) instead of generic <div> tags?",
        options: [
          "They render in 3D in modern web browsers",
          "They provide meaningful document structure that enhances SEO, search indexing, and assistive screen reader accessibility (a11y)",
          "They automatically disable CSS styling overrides",
          "They make network downloads 50% faster"
        ],
        correct_index: 1,
        explanation: "Semantic tags convey meaning to search engine crawlers and assistive accessibility technologies, creating accessible landmarks."
      },
      {
        id: "html_q2",
        text: "What is the purpose of the '<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">' tag in an HTML document?",
        options: [
          "To enable WebGL hardware acceleration",
          "To configure the viewport dimensions and zoom level for responsive rendering across mobile and desktop devices",
          "To set the browser tab favicon",
          "To prevent users from right-clicking on the webpage"
        ],
        correct_index: 1,
        explanation: "The viewport meta tag ensures mobile browsers match the device screen width instead of pretending to be a 980px desktop browser."
      },
      {
        id: "html_q3",
        text: "Which HTML form attribute prevents form submission if an input field is empty?",
        options: [
          "validate=\"true\"",
          "required",
          "not-null",
          "enforce"
        ],
        correct_index: 1,
        explanation: "The boolean attribute 'required' instructs the browser to enforce that the form control must have a value before submission."
      },
      {
        id: "html_q4",
        text: "What does the 'alt' attribute on an '<img>' tag accomplish?",
        options: [
          "Specifies alternative text for screen readers and when the image fails to load",
          "Provides a tooltip when hovering over the image",
          "Defines the CSS alignment of the image",
          "Specifies a fallback image URL"
        ],
        correct_index: 0,
        explanation: "The alt attribute provides alternative text for accessibility (screen readers) and renders when the image resource cannot be loaded."
      },
      {
        id: "html_q5",
        text: "What is the key difference between '<script src=\"app.js\" async>' and '<script src=\"app.js\" defer>'?",
        options: [
          "'async' executes as soon as it is downloaded (potentially out-of-order), while 'defer' executes after HTML parsing completes in document order",
          "'defer' downloads synchronously, while 'async' downloads asynchronously",
          "'async' only works for module scripts, while 'defer' is for classical scripts",
          "There is no difference in modern browsers"
        ],
        correct_index: 0,
        explanation: "Both download asynchronously without blocking HTML parsing; 'defer' guarantees execution in source order after DOM parsing finishes."
      }
    ]
  },
  css: {
    id: "asm-css",
    skill_id: "sk-css",
    title: "CSS3 & Modern Layouts Quiz",
    skill_name: "CSS3",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "css_q1",
        text: "What is the key difference between CSS Flexbox and CSS Grid?",
        options: [
          "Flexbox is designed for 1-dimensional layouts (rows OR columns), while CSS Grid is designed for 2-dimensional layouts (rows AND columns simultaneously)",
          "Flexbox is only for mobile layouts, Grid is only for desktop layouts",
          "Grid cannot center elements vertically",
          "Flexbox requires JavaScript polyfills"
        ],
        correct_index: 0,
        explanation: "Flexbox manages distribution along a single axis (row or column), while CSS Grid coordinates tracks across two dimensions."
      },
      {
        id: "css_q2",
        text: "What is the benefit of setting 'box-sizing: border-box;' globally in CSS?",
        options: [
          "Element width and height include padding and borders, preventing layout blowouts when adding padding",
          "It makes borders rounded automatically",
          "It removes margins between elements",
          "It makes all elements display as block elements"
        ],
        correct_index: 0,
        explanation: "With border-box, the specified width includes content, padding, and border, making sizing predictable and calculations intuitive."
      },
      {
        id: "css_q3",
        text: "Which CSS selector has the highest specificity?",
        options: [
          "div.nav-link:hover",
          "#main-header",
          "ul li.active",
          "button[type='submit']"
        ],
        correct_index: 1,
        explanation: "An ID selector (#main-header) has specificity (1, 0, 0), which beats any combination of classes, attributes, or element selectors."
      },
      {
        id: "css_q4",
        text: "How do CSS Custom Properties (Variables) defined with '--brand-color: #6366F1;' differ from preprocessor variables?",
        options: [
          "CSS variables are dynamic, live in the browser DOM cascade, and can be updated at runtime via JavaScript or media queries",
          "CSS variables cannot be inherited by children",
          "CSS variables require a build step to compile",
          "CSS variables only work for colors"
        ],
        correct_index: 0,
        explanation: "CSS variables are live DOM variables that cascade, inherit, and can be altered dynamically in JavaScript via element.style.setProperty()."
      },
      {
        id: "css_q5",
        text: "What CSS rule centers a child element both horizontally and vertically inside a flex container?",
        options: [
          "display: flex; justify-content: center; align-items: center;",
          "display: flex; text-align: center; float: center;",
          "display: flex; margin: auto center;",
          "display: flex; vertical-align: middle;"
        ],
        correct_index: 0,
        explanation: "justify-content: center aligns along the main axis; align-items: center aligns along the cross axis."
      }
    ]
  },
  react: {
    id: "asm-react",
    skill_id: "sk-react",
    title: "React Architecture & Hooks Quiz",
    skill_name: "React",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "react_q1",
        text: "Why must you NOT call React Hooks inside loops, conditions, or nested functions?",
        options: [
          "React relies on the call order of hooks to preserve state identity across consecutive component re-renders",
          "Hooks are converted to class methods during compilation",
          "It causes memory leaks in the browser V8 engine",
          "React hooks are asynchronous"
        ],
        correct_index: 0,
        explanation: "The Rules of Hooks enforce top-level execution so React can match each hook with its internal fiber linked list by execution order."
      },
      {
        id: "react_q2",
        text: "What happens if you omit the dependency array in 'useEffect(() => { ... })'?",
        options: [
          "The effect only runs once when the component mounts",
          "The effect runs on initial mount AND after EVERY single render of the component",
          "The effect never runs",
          "React throws a compile error"
        ],
        correct_index: 1,
        explanation: "No dependency array means the effect executes after every render. An empty array [] runs once on mount; [dep] runs when dep changes."
      },
      {
        id: "react_q3",
        text: "What is the purpose of the 'key' prop when rendering lists of elements in React?",
        options: [
          "It gives the elements unique CSS styling IDs",
          "It helps React's reconciliation algorithm identify which items have changed, been added, or been removed, minimizing DOM mutations",
          "It encrypts the list items in browser memory",
          "It allows elements to be accessed via document.getElementById"
        ],
        correct_index: 1,
        explanation: "Keys provide stable identities for virtual DOM elements during reconciliation, preventing expensive DOM recreations."
      },
      {
        id: "react_q4",
        text: "When should you use the 'useMemo' hook in React?",
        options: [
          "For every single calculation in a component",
          "To memoize the result of an expensive calculation between re-renders when its inputs have not changed",
          "To perform side effects like fetching data from an API",
          "To replace Redux or global state management"
        ],
        correct_index: 1,
        explanation: "useMemo caches computation results to avoid unnecessary recalculation on re-renders when dependencies remain unchanged."
      },
      {
        id: "react_q5",
        text: "What is the Virtual DOM in React?",
        options: [
          "A browser plugin for rendering 3D graphics",
          "A lightweight in-memory representation of the real DOM tree used to compute minimal DOM diffs (reconciliation)",
          "A shadow DOM implementation for custom web components",
          "A database table stored in browser IndexedDB"
        ],
        correct_index: 1,
        explanation: "The Virtual DOM is a JavaScript object tree representation that React diffs against previous renders to batch optimal real DOM updates."
      }
    ]
  },
  sql: {
    id: "asm-sql",
    skill_id: "sk-sql",
    title: "SQL & Relational Databases Quiz",
    skill_name: "SQL",
    duration_minutes: 15,
    passing_score: 75.0,
    questions: [
      {
        id: "sql_q1",
        text: "What is the difference between an INNER JOIN and a LEFT JOIN in SQL?",
        options: [
          "INNER JOIN returns only rows that have matches in both tables; LEFT JOIN returns all rows from the left table plus matching rows from the right table (with NULLs for non-matches)",
          "INNER JOIN is for strings, LEFT JOIN is for numbers",
          "LEFT JOIN deletes unmatched rows from the database",
          "INNER JOIN is slower in all database engines"
        ],
        correct_index: 0,
        explanation: "INNER JOIN filters out rows that lack counterparts; LEFT JOIN preserves all left table records regardless of whether a right match exists."
      },
      {
        id: "sql_q2",
        text: "What is the difference between the WHERE clause and the HAVING clause in SQL?",
        options: [
          "WHERE filters individual rows before aggregation; HAVING filters groups after GROUP BY aggregation functions have been evaluated",
          "HAVING is used for sorting, WHERE is used for filtering",
          "WHERE only works on primary keys",
          "There is no difference"
        ],
        correct_index: 0,
        explanation: "WHERE filters source rows before grouping; HAVING filters aggregated groups (e.g. HAVING COUNT(*) > 5)."
      },
      {
        id: "sql_q3",
        text: "What do the ACID properties stand for in relational database transactions?",
        options: [
          "Atomicity, Consistency, Isolation, Durability",
          "Asynchronous, Concurrent, Indexed, Distributed",
          "Availability, Consistency, Integrity, Durability",
          "Authentication, Cryptography, Identity, Delegation"
        ],
        correct_index: 0,
        explanation: "ACID guarantees that database transactions are processed reliably: all or nothing (Atomic), valid state (Consistent), independent (Isolated), and persistent (Durable)."
      },
      {
        id: "sql_q4",
        text: "What does a B-Tree index on a database column do to improve query performance?",
        options: [
          "Compresses table data on disk",
          "Allows the database engine to find specific rows in O(log n) time without scanning every row in the table (Full Table Scan)",
          "Prevents any write operations to the table",
          "Automatically executes queries in parallel on multiple GPUs"
        ],
        correct_index: 1,
        explanation: "B-Tree indexes maintain a balanced tree structure that reduces lookup time from O(n) table scans to O(log n) lookups."
      },
      {
        id: "sql_q5",
        text: "How do you prevent SQL Injection vulnerabilities when executing queries with user inputs in applications?",
        options: [
          "Concatenate strings with single quotes",
          "Use parameterized queries (prepared statements) that separate SQL code from user-supplied data",
          "Convert all user input to uppercase letters",
          "Run queries only inside a try-catch block"
        ],
        correct_index: 1,
        explanation: "Parameterized queries ensure user input is treated strictly as data literals and never interpreted as executable SQL syntax."
      }
    ]
  },
  git: {
    id: "asm-git",
    skill_id: "sk-git",
    title: "Git Version Control & Collaboration Quiz",
    skill_name: "Git",
    duration_minutes: 10,
    passing_score: 75.0,
    questions: [
      {
        id: "git_q1",
        text: "What is the key difference between 'git merge' and 'git rebase'?",
        options: [
          "'git merge' creates a 3-way merge commit preserving true branch topology; 'git rebase' rewrites commit history by moving commits onto the tip of another branch for a linear history",
          "'git rebase' deletes the source branch permanently",
          "'git merge' can only be run once per repository",
          "'git rebase' cannot resolve conflicts"
        ],
        correct_index: 0,
        explanation: "Merge preserves non-linear history with a merge commit; rebase replays your commits atop the target branch, creating new commit SHAs."
      },
      {
        id: "git_q2",
        text: "What does 'git cherry-pick <commit-hash>' do?",
        options: [
          "Deletes that specific commit from the remote repository",
          "Applies the changes introduced by an existing commit from another branch onto the current working branch",
          "Reverts the entire commit history back to that commit",
          "Creates a new tag at that commit"
        ],
        correct_index: 1,
        explanation: "Cherry-pick selects a specific commit by hash and replays its diff onto the currently checked-out branch."
      },
      {
        id: "git_q3",
        text: "What is a 'detached HEAD' state in Git?",
        options: [
          "A state where Git is corrupted and cannot commit changes",
          "When HEAD points directly to a specific commit SHA rather than to a named branch reference",
          "When remote origin has been disconnected",
          "When a rebase has completed without errors"
        ],
        correct_index: 1,
        explanation: "Detached HEAD means HEAD references a commit directly (e.g. git checkout <hash>), so new commits aren't associated with any branch unless you create one."
      },
      {
        id: "git_q4",
        text: "What is the difference between 'git reset --soft' and 'git reset --hard'?",
        options: [
          "'--soft' moves HEAD back but leaves changes staged in the index; '--hard' moves HEAD and completely discards all staged and working directory changes",
          "'--hard' creates a backup commit, '--soft' does not",
          "'--soft' deletes uncommitted files",
          "There is no difference in Git"
        ],
        correct_index: 0,
        explanation: "git reset --soft rewinds the commit history but preserves changes in the staging index; --hard obliterates working directory modifications."
      },
      {
        id: "git_q5",
        text: "What command temporarily shelves uncommitted local changes so you can pull or switch branches on a clean working directory?",
        options: [
          "git stash",
          "git pause",
          "git freeze",
          "git archive"
        ],
        correct_index: 0,
        explanation: "git stash saves dirty working directory state to a local stack and reverts back to HEAD; use 'git stash pop' to restore changes."
      }
    ]
  }
};

export function getQuizForSkill(skillIdentifier) {
  if (!skillIdentifier) return QUIZ_BANKS.cpp;
  const key = skillIdentifier.toLowerCase().replace('sk-', '').replace('asm-', '').trim();
  if (QUIZ_BANKS[key]) {
    return QUIZ_BANKS[key];
  }
  // Try matching by name or substring
  for (const [k, quiz] of Object.entries(QUIZ_BANKS)) {
    if (k.includes(key) || key.includes(k) || quiz.skill_name.toLowerCase().includes(key)) {
      return quiz;
    }
  }
  // Fallback to C++ or Python
  return QUIZ_BANKS.cpp;
}
