---
layout: post
title: "Draft: Always write acceptance test first"
categories: case-study
tags: java programming test tdd bdd
hidden: true
seo:
  type: BlogPosting
image:
  path: /images/previews/do-not-mock.jpg
  hide: true
share: true
---

Blackbox acceptance tests provide a user viewpoint and stability 
amidst changing requirements. The secret sauce? Write tests before
implementation for optimal reliability.

# tl;dr
An acceptance test is a **blackbox** test from a **user** 
perspective.
- when providing an API, another developer can be this **user**
- a test that does not presume anything other than the
public API is a **blackbox** test

These properties give test the following benefits:
- it is straightforward to translate requirements into tests
- they remain stable despite changes from future requirements

Real stability in tests comes from writing them as genuine 
**blackbox** tests. This approach is notably more manageable when 
tests are crafted **before** the actual implementation.

# A little tale about changing requirements

A not so long time ago, I stumbled over a change request in the
project I'm currently working on.
There was a component that over time received many changes. 
The requirements had changed multiple times over the past months, 
and I was not really sure if all the code made perfectly sense 
anymore.
It seemed as if from time to time new requirements had partially
overwritten the functionality of older requirements. And it 
was not really clear if the authors had made those changes 
consciously or not.

In the following chapter, I will present an example which tries
to highlight the importance of proper acceptance tests. 
The example is a very condensed version of one of the classes
of this component.

## A simple data store

### Everything starts simple

We started with a simple data store. The main feature is that
a default value can be provided on initialization.

```java
class DataStore<V> {
    
    V value;

    DataStore() {
        this(null);
    }

    DataStore(V defaultValue) {
        store(defaultValue);
    }

    void store(V value) {
        this.value = value;
    }

    V retrieve() {
        return value;
    }
}
```

### First Feature: keep default until real value is provided

We notice that some clients at startup were writing `null` 
multiple times to the store. After some time, they would start
using it _normally_.

We were requested to not clean the default in these cases and
just keep it until the real values would come in.

This was an easy change for us to do.

```diff
  void store(V value) {
-   this.value = value;
+   if(value != null)
+     this.value = value;
  }
```

To check that it actually worked, we wrote the following test.
<span id="shouldNotDeleteValue"/>
```java
@Test
void shouldNotDeleteValue() {
    var store = new DataStore<String>();
    
    store.store("some-value");    
    store.store(null);
    
    assertThat(store.retrieve()).isEqualTo("some-value");
}
```

### Second Feature: make default available

The next requested change was to be able to provide the 
initial used default value when asked.

We noticed that we had to do a bigger refactoring for this kind
of change and ended up with the following implementation:

<span id="refactoring"/>

```java
class DataStore<V> {

    V value, defaultValue;

    DataStore() {
        this(null);
    }

    DataStore(V defaultValue) {
        this.defaultValue = defaultValue;
    }

    void store(V value) {
        this.value = value;
    }

    V retrieve() {
        return value != null ? value : defaultValue;
    }

    V getDefaultValue() {
        return defaultValue;
    }
}
```

Suddenly our previous test broke...

### What happened?

#### Was our test really testing what it was supposed to?

Let's compare our old [test](#shouldNotDeleteValue)
to the original [requirement](#first-feature-keep-default-until-real-value-is-provided).
We notice that they do not really fit together. The requirement 
could have been written in the following 
[style](https://cucumber.io/docs/gherkin/reference/).
```gherkin
Scenario: keeping default
  Given a data store initialized with default "my-default"
  When storing a NULL value  
  Then retrieving the value should produce "my-default"
```

Our test does not initialize a store with a default value, 
but instead provides a value with the normal `store` method. 
The correct API usage would have been initializing the store with 
the constructor.

#### How did we end up in this place?

Let's think about the reasons the original author might have 
thought that this was a correct way to write the test.

We notice that it actually didn't matter back then if the
constructor or the store method was called. The constructor was
just delegating to the store method.

Another thing we notice is that the test is 
named `shouldNotDeleteValue`. This let me believe that something 
like the following might have happened.

1. a dev took a look at the current code and thought about what
simple change will suffice
1. the if-statement was quickly added
1. the dev thought about how to test the if-statement
1. it did not matter to the dev how the `value` field was set to
a non-null value, so the `store` method was chosen at random
1. now a proper name had to be chosen for the test
1. by looking at the test code it made sens to name it 
`shouldNotDeleteValue`

## The order of working

The existing code was developed in the following order.
```
requirement -> code -> test code -> test case
```
Like in a game of
[telephone](https://en.wikipedia.org/wiki/Chinese_whispers)
information was lost at every step.

While working on a task, it is perfectly normal for a developer
to only keep in mind what was done in the directly preceding step.

The `test code` is based on the written `code` and so very likely
a **highly coupled white-box test**.

The name of the `test-case` is based on the `test code` and 
because of that does no longer bear any resemblance of 
the original `requirement`.

### Why does it even matter?

We have a failing test even thought our 
[refactoring](#refactoring) of the data store is compatible 
with the 
[first requirement](#first-feature-keep-default-until-real-value-is-provided).

The reason is that the [test](#shouldNotDeleteValue) is 
highly coupled to the past implementation. As a consequence, 
the test is actively hindering us to refactor our code.

Another problem is the name of the test. Let's imagine that the
second feature is developed by a developer which does not know 
anything about the first requirement. This developer now has to 
deduce the original requirement from the failing test.

This is required, because the dev has to either:
- "fix" the test (when the underlying API changed)
- change the new code to fit both requirements
- check if the old requirement is obsolete

If we look back, our test is named `shouldNotDeleteValue`. This 
name does not provide any hints that the original requirement had 
anything to do with the default value.

If I was the developer, I would probably think that I need to 
change my implementation to fit this old requirement.

## How could we improve?

Both issues (naming & coupling) can be fixed by inverting the
order in which we do the development steps.
```
requirement -> test case -> test code -> code
```
For some, this might seem very similar to what 
[BDD](https://en.wikipedia.org/wiki/Behavior-driven_development)
is suggesting. And it basically is, but let's not get distracted.

Following this order, I would come up with the following test.
This test is not that different from the 
[original one](#shouldNotDeleteValue), but improves in both areas:
- the name clearly communicates the original 
[requirement](#first-feature-keep-default-until-real-value-is-provided)
- this test passes even after the [refactoring](#refactoring) from
the second feature request

```java
@Test
void shouldRetrieveDefaultWhenNullValueIsStored() {
    var store = new DataStore<>("my-default");
      
    store.store(null);
    
    assertThat(store.retrieve()).isEqualTo("my-default");
}
```

I believe that working in this way would lead to no other test.

Why would one not mention the default value in the test case? 
It is the most prominent thing in the requirement. 

While writing the test code, no one would think not to use the 
correct API to set the default value. It is mentioned only one 
line above in the test name.

# Lessons learned

- test names are important documentation for future developers
- highly coupled tests do
  - hinder refactorings
  - burdens future developers to discover old requirements
- the way of working dictates the easiest path that we are 
unconsciously following
- we can nudge ourselves to follow best practices by changing
the way we are working
